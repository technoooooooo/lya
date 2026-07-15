import { createClient } from "@/lib/supabase/server";
import { embedQuery } from "./embeddings";

export interface RetrievedChunk {
  content: string;
  documentTitle: string;
  similarity: number;
}

// Seuil de similarité cosine en dessous duquel un chunk est considéré comme
// hors sujet et n'est pas injecté dans le prompt (économie de tokens et moins
// de bruit sur les messages sans rapport avec la base de connaissances).
const DEFAULT_MATCH_THRESHOLD = 0.25;

/**
 * Récupère les passages les plus pertinents de la base de connaissance
 * pour une requête donnée, via recherche vectorielle (pgvector).
 * Ne lève jamais : en cas d'erreur (embedding, RPC), renvoie [] pour ne pas
 * casser le flux de chat — le prompt retombe alors sur le noyau seul.
 */
export async function retrieveRelevantChunks(
  query: string,
  matchCount = 6,
  matchThreshold = DEFAULT_MATCH_THRESHOLD
): Promise<RetrievedChunk[]> {
  try {
    const embedding = await embedQuery(query);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: embedding as unknown as string,
      match_count: matchCount,
      match_threshold: matchThreshold,
    });

    if (error || !data) {
      if (error) console.error("match_knowledge_chunks RPC error:", error.message);
      return [];
    }

    return (data as { content: string; title: string; similarity: number }[]).map(
      (row) => ({
        content: row.content,
        documentTitle: row.title,
        similarity: row.similarity,
      })
    );
  } catch (err) {
    console.error("retrieveRelevantChunks error:", err);
    return [];
  }
}
