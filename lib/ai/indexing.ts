import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkText } from "./chunking";
import { embedTexts } from "./embeddings";

/**
 * Module central d'indexation RAG : extraction PDF, découpage, vectorisation
 * et stockage des chunks. Toute la chaîne « texte → knowledge_chunks » passe
 * par ici (routes admin et script de réindexation).
 */

/**
 * Extrait le texte complet d'un PDF. Renvoie null si l'extraction échoue.
 */
export async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  } catch {
    return null;
  }
}

/**
 * Découpe, vectorise et insère le texte d'un fichier dans knowledge_chunks.
 * Throw en cas d'échec (embedding ou insertion) — l'appelant gère le rollback.
 * Renvoie le nombre de chunks indexés.
 */
export async function indexFileChunks(
  supabase: SupabaseClient,
  params: { documentId: string; fileId: string; text: string }
): Promise<number> {
  const text = params.text.trim();
  if (text.length === 0) return 0;

  const chunks = chunkText(text);
  if (chunks.length === 0) return 0;

  const embeddings = await embedTexts(chunks);
  const rows = chunks.map((content, index) => ({
    document_id: params.documentId,
    file_id: params.fileId,
    chunk_index: index,
    content,
    embedding: JSON.stringify(embeddings[index]),
  }));

  const { error } = await supabase.from("knowledge_chunks").insert(rows);
  if (error) throw new Error(error.message);

  return chunks.length;
}

/**
 * (Ré)indexe le `content` textuel d'un knowledge_document dans knowledge_chunks.
 * Les chunks issus du content ont `file_id = null` (par opposition aux chunks
 * issus des fichiers PDF).
 *
 * Ordre volontaire : on calcule d'abord les embeddings (qui peuvent throw sur
 * une erreur API) AVANT de supprimer les anciens chunks — ainsi un échec laisse
 * l'index existant intact.
 */
export async function reindexDocumentContent(
  supabase: SupabaseClient,
  documentId: string,
  content: string | null | undefined
): Promise<void> {
  const text = (content ?? "").trim();

  const chunks = text.length > 0 ? chunkText(text) : [];
  const embeddings = chunks.length > 0 ? await embedTexts(chunks) : [];

  // Remplacer les anciens chunks de content (file_id null) de ce document
  await supabase
    .from("knowledge_chunks")
    .delete()
    .eq("document_id", documentId)
    .is("file_id", null);

  if (chunks.length === 0) return;

  const rows = chunks.map((chunkContent, index) => ({
    document_id: documentId,
    file_id: null,
    chunk_index: index,
    content: chunkContent,
    embedding: JSON.stringify(embeddings[index]),
  }));

  const { error } = await supabase.from("knowledge_chunks").insert(rows);
  if (error) throw new Error(error.message);
}
