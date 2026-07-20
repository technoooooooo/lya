import { createClient } from "@/lib/supabase/server";
import { stripMarkdownLinks } from "@/lib/chat/attachments";
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

// Nombre d'extraits récupérés par requête, et plafond global après fusion des
// requêtes multiples (demandes de plan).
const DEFAULT_MATCH_COUNT = 8;
const MAX_MERGED_CHUNKS = 14;

// Taille max du texte envoyé à l'embedding (limite ~8k tokens du modèle) :
// pour un long document collé, le début suffit à situer le sujet.
const MAX_EMBED_QUERY_CHARS = 6000;

/**
 * Détecte une demande de création/mise à jour de plan d'entraînement. Utilisé
 * pour élargir la récupération aux documents structurants (structure des
 * plans, catalogue d'exercices) que la seule similarité avec le message ne
 * remonte pas de façon fiable.
 */
export function isPlanRequest(message: string): boolean {
  const m = message.toLowerCase();
  const planWord = /\b(plans?|programmes?|planning)\b/.test(m);
  const trainingWord = /(entra[iî]nement|exercice|drill|s[ée]ance|semaine|mois)/.test(m);
  return planWord && trainingWord;
}

// Requêtes complémentaires lancées en parallèle sur une demande de plan, pour
// garantir la présence des documents structurants dans le contexte quel que
// soit le phrasé de l'utilisateur.
const PLAN_SUPPORT_QUERIES = [
  "structure type d'un plan d'entraînement mensuel : semaines, séances, organisation des blocs de travail",
  "exercices et drills de la méthode : objectif, consignes, lien vidéo de démonstration",
];

/**
 * Récupère les passages les plus pertinents de la base de connaissance
 * pour une requête donnée, via recherche vectorielle (pgvector).
 * Ne lève jamais : en cas d'erreur (embedding, RPC), renvoie [] pour ne pas
 * casser le flux de chat — le prompt retombe alors sur le noyau seul.
 */
export async function retrieveRelevantChunks(
  query: string,
  matchCount = DEFAULT_MATCH_COUNT,
  matchThreshold = DEFAULT_MATCH_THRESHOLD
): Promise<RetrievedChunk[]> {
  try {
    const embedding = await embedQuery(query.slice(0, MAX_EMBED_QUERY_CHARS));
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

/**
 * Récupération pour un message de chat : la requête d'embedding est
 * contextualisée avec les derniers messages de l'utilisateur (« et pour le
 * mois suivant ? » seul ne ressemble à rien dans la base — le sujet est dans
 * les tours précédents), et une demande de plan déclenche des requêtes
 * complémentaires fusionnées puis dédupliquées.
 */
export async function retrieveForMessage(
  message: string,
  history: { role: string; content: string }[]
): Promise<RetrievedChunk[]> {
  // Les URLs de pièces jointes n'apportent que du bruit à l'embedding.
  const recentUserMessages = history
    .filter((m) => m.role === "user")
    .slice(-2)
    .map((m) => stripMarkdownLinks(m.content).slice(0, 500));
  const contextualQuery = [...recentUserMessages, stripMarkdownLinks(message)].join("\n");

  const queries = [contextualQuery];
  if (isPlanRequest(message)) {
    queries.push(...PLAN_SUPPORT_QUERIES);
  }

  const results = await Promise.all(
    queries.map((q) => retrieveRelevantChunks(q))
  );

  // Fusion + déduplication : le même chunk peut matcher plusieurs requêtes.
  const seen = new Set<string>();
  const merged: RetrievedChunk[] = [];
  for (const chunk of results
    .flat()
    .sort((a, b) => b.similarity - a.similarity)) {
    const key = chunk.documentTitle + chunk.content.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(chunk);
  }
  return merged.slice(0, MAX_MERGED_CHUNKS);
}
