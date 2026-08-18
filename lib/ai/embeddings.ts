import { serverEnv } from "@/lib/env";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = serverEnv("EMBEDDING_MODEL") || "text-embedding-3-small";

// OpenAI accepte plusieurs inputs par appel ; on batch pour limiter les requêtes.
const BATCH_SIZE = 100;

async function embedBatch(inputs: string[]): Promise<number[][]> {
  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverEnv("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI embeddings error: ${response.status} - ${
        error.error?.message || "Unknown error"
      }`
    );
  }

  const data = await response.json();
  // On préserve l'ordre des inputs via le champ `index`.
  return (data.data as { index: number; embedding: number[] }[])
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Vectorise une liste de textes. Renvoie les embeddings dans le même ordre que `texts`.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = await embedBatch(batch);
    embeddings.push(...batchEmbeddings);
  }
  return embeddings;
}

/**
 * Vectorise un texte unique (utilisé pour la requête de recherche).
 */
export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text]);
  return embedding;
}
