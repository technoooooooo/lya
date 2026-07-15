// Découpage de texte en chunks pour la vectorisation RAG.
// Cible ~3500 caractères (~800-1000 tokens) avec un chevauchement de ~15%
// pour préserver le contexte à la frontière des chunks.

const CHUNK_SIZE = 3500;
const CHUNK_OVERLAP = 500;

/**
 * Découpe un texte en chunks. Essaie de couper sur une frontière de paragraphe
 * ou de phrase proche de la taille cible, avec chevauchement entre chunks.
 */
export function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) return [];
  if (normalized.length <= chunkSize) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    // Si on n'est pas à la fin, tenter de couper sur une frontière naturelle
    // dans la dernière portion du chunk (paragraphe > phrase > espace).
    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const searchFrom = Math.floor(chunkSize * 0.6);
      const breakPoint =
        lastIndexInRange(window, "\n\n", searchFrom) ??
        lastIndexInRange(window, "\n", searchFrom) ??
        lastIndexInRange(window, ". ", searchFrom) ??
        lastIndexInRange(window, " ", searchFrom);

      if (breakPoint !== null) {
        end = start + breakPoint;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);

    if (end >= normalized.length) break;
    // Avancer avec chevauchement, en s'assurant de progresser.
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

// Renvoie l'index de fin (après le séparateur) de la dernière occurrence de
// `sep` située au-delà de `minIndex`, ou null si aucune.
function lastIndexInRange(
  text: string,
  sep: string,
  minIndex: number
): number | null {
  const idx = text.lastIndexOf(sep);
  if (idx >= minIndex) return idx + sep.length;
  return null;
}
