/**
 * Réindexation RAG des fichiers de la base de connaissance déjà uploadés.
 *
 * Les nouveaux uploads sont vectorisés automatiquement par la route d'upload.
 * Ce script (one-off) traite les fichiers existants qui n'ont pas encore de
 * chunks : il re-télécharge le PDF depuis le storage, ré-extrait le texte
 * COMPLET (les anciens `extracted_text` étaient tronqués à 50k), découpe,
 * vectorise et insère dans `knowledge_chunks`.
 *
 * Lancement :
 *   npx tsx --env-file=.env.local scripts/reindex-knowledge.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  extractPdfText,
  indexFileChunks,
  reindexDocumentContent,
} from "../lib/ai/indexing";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const supabase = getAdminClient();

  // Fichiers PDF sans aucun chunk
  const { data: files, error } = await supabase
    .from("knowledge_files")
    .select("id, document_id, file_name, storage_path, mime_type, knowledge_chunks(id)")
    .eq("mime_type", "application/pdf");

  if (error) throw error;

  const toIndex = (files ?? []).filter(
    (f: { knowledge_chunks?: unknown[] }) =>
      !f.knowledge_chunks || f.knowledge_chunks.length === 0
  );

  console.log(`${toIndex.length} fichier(s) à réindexer.`);

  for (const file of toIndex) {
    console.log(`→ ${file.file_name}`);

    // Télécharger le PDF depuis le storage
    const { data: blob, error: dlError } = await supabase.storage
      .from("knowledge-files")
      .download(file.storage_path);
    if (dlError || !blob) {
      console.error(`  ✗ téléchargement échoué : ${dlError?.message}`);
      continue;
    }

    // Extraire le texte complet
    const buffer = Buffer.from(await blob.arrayBuffer());
    const text = await extractPdfText(buffer);

    if (!text || text.trim().length === 0) {
      console.log("  (aucun texte extrait, ignoré)");
      continue;
    }

    // Chunk + embeddings + insert
    try {
      const chunkCount = await indexFileChunks(supabase, {
        documentId: file.document_id,
        fileId: file.id,
        text,
      });
      console.log(`  ✓ ${chunkCount} chunks indexés`);
    } catch (e) {
      console.error(`  ✗ indexation échouée : ${(e as Error).message}`);
      continue;
    }
  }

  // Réindexer le content textuel des documents (chunks avec file_id null)
  const { data: docs, error: docsError } = await supabase
    .from("knowledge_documents")
    .select("id, title, content");
  if (docsError) throw docsError;

  console.log(`\n${(docs ?? []).length} document(s) — réindexation du contenu…`);
  for (const doc of docs ?? []) {
    if (!doc.content || doc.content.trim().length === 0) {
      console.log(`→ ${doc.title} : (contenu vide, ignoré)`);
      continue;
    }
    await reindexDocumentContent(supabase, doc.id, doc.content);
    console.log(`→ ${doc.title} : contenu réindexé`);
  }

  console.log("Terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
