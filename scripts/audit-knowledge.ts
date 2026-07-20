/**
 * Audit de la base de connaissances RAG :
 * - inventaire documents / fichiers / chunks
 * - contenu de ai_config, guardrails, pillars
 * - retrievals de test pour mesurer ce que le chat reçoit réellement
 *
 * Lancement :
 *   npx tsx --env-file=.env.local scripts/audit-knowledge.ts
 */
import { createClient } from "@supabase/supabase-js";
import { embedQuery } from "../lib/ai/embeddings";

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

const TEST_QUERIES = [
  "Crée-moi mon plan d'entraînement du mois prochain",
  "structure type d'un plan d'entraînement mensuel : semaines, séances, organisation des blocs de travail",
  "exercices et drills de la méthode : objectif, consignes, lien vidéo de démonstration",
  "exercice de putting pour le contrôle de distance",
  "comment progresser au petit jeu autour du green",
];

async function main() {
  const supabase = getAdminClient();

  console.log("========== DOCUMENTS ==========");
  const { data: docs, error: docsErr } = await supabase
    .from("knowledge_documents")
    .select("id, title, content, created_at, knowledge_chunks(id)");
  if (docsErr) throw docsErr;
  for (const d of docs ?? []) {
    const contentLen = (d.content ?? "").length;
    const chunkCount = (d.knowledge_chunks as unknown[] | null)?.length ?? 0;
    console.log(
      `- ${d.title} | content: ${contentLen} car. | chunks: ${chunkCount}`
    );
  }
  console.log(`Total documents: ${(docs ?? []).length}`);

  const { count: totalChunks } = await supabase
    .from("knowledge_chunks")
    .select("id", { count: "exact", head: true });
  console.log(`Total chunks: ${totalChunks}`);

  console.log("\n========== FICHIERS ==========");
  const { data: files } = await supabase
    .from("knowledge_files")
    .select("file_name, mime_type, knowledge_chunks(id), knowledge_documents(title)");
  for (const f of files ?? []) {
    const chunkCount = (f.knowledge_chunks as unknown[] | null)?.length ?? 0;
    const docTitle = (f.knowledge_documents as { title?: string } | null)?.title ?? "?";
    console.log(`- ${f.file_name} (${f.mime_type}) → doc "${docTitle}" | chunks: ${chunkCount}`);
  }

  console.log("\n========== AI_CONFIG ==========");
  const { data: configs } = await supabase.from("ai_config").select("key, value");
  for (const c of configs ?? []) {
    console.log(`--- ${c.key} (${(c.value ?? "").length} car.) ---`);
    console.log((c.value ?? "").slice(0, 1200));
    console.log("...\n");
  }

  console.log("========== GUARDRAILS ==========");
  const { data: guardrails } = await supabase
    .from("guardrails")
    .select("type, subject, description, is_active");
  for (const g of guardrails ?? []) {
    console.log(`- [${g.is_active ? "actif" : "inactif"}] ${g.type}: ${g.subject} — ${(g.description ?? "").slice(0, 100)}`);
  }

  console.log("\n========== PILIERS ==========");
  const { data: pillars } = await supabase
    .from("pillars")
    .select("name, pre_prompt")
    .order("display_order");
  for (const p of pillars ?? []) {
    console.log(`- ${p.name} | pre_prompt: ${(p.pre_prompt ?? "").length} car.`);
  }

  console.log("\n========== RETRIEVALS DE TEST (threshold 0.25, top 8) ==========");
  for (const q of TEST_QUERIES) {
    console.log(`\n>>> « ${q} »`);
    const embedding = await embedQuery(q);
    const { data: matches, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: embedding as unknown as string,
      match_count: 8,
      match_threshold: 0.25,
    });
    if (error) {
      console.log("  RPC error:", error.message);
      continue;
    }
    if (!matches || matches.length === 0) {
      console.log("  (aucun résultat au-dessus du seuil)");
      continue;
    }
    for (const m of matches as { title: string; similarity: number; content: string }[]) {
      console.log(
        `  ${m.similarity.toFixed(3)} | ${m.title} | ${m.content.slice(0, 90).replace(/\n/g, " ")}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
