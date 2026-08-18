import { parseAttachments, type ParsedAttachment } from "./attachments";
import {
  detectFormat,
  isVisionFormat,
  withFormatExtension,
  FORMAT_SNIFF_BYTES,
  type FileFormat,
} from "./fileFormat";
import { SUPABASE_URL } from "@/lib/env";
import type { AIContentPart } from "@/lib/ai/types";

// Construction du contexte multimodal envoyé au modèle à partir des pièces
// jointes d'une conversation (côté serveur uniquement).
//
// Deux traitements distincts :
//   - images  → parts `image_url` en `detail: high` (une carte de score ou une
//     carte de parcours ne se lit pas en basse résolution)
//   - PDF     → texte extrait à l'upload (sidecar .txt) quand il est
//     exploitable, sinon le PDF lui-même en part `file` : c'est le seul moyen
//     de lire une carte de parcours scannée, qui ne contient aucun texte.
//
// Le format annoncé par le markdown du message n'est jamais pris pour argent
// comptant : chaque image est reniflée dans le bucket avant d'être envoyée.
// Les messages d'avant la détection par signature binaire contiennent des
// `![…](…)` qui pointent en réalité vers un PDF ou une photo HEIC ; l'API
// vision répondait alors 400 et TOUTE la conversation devenait inutilisable,
// message après message, puisque l'historique rejoue les pièces jointes.

const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/chat-attachments/`;

// Images gardées en contexte, message courant inclus. Au-delà, le coût en
// tokens grimpe pour un intérêt faible — on conserve les plus récentes.
const MAX_IMAGES = 4;
// Marge de candidates reniflées : une pièce jointe écartée ou reclassée en PDF
// ne doit pas amputer le nombre d'images réellement transmises.
const IMAGE_CANDIDATES = MAX_IMAGES + 2;
// Documents gardés en contexte (les plus récents de la conversation).
const MAX_DOCS = 2;
// En deçà, le texte extrait est considéré comme inexploitable (PDF scanné) et
// on bascule sur l'envoi du PDF natif.
const MIN_USABLE_TEXT_LENGTH = 200;
// Plafond d'envoi d'un PDF natif (avant encodage base64).
const MAX_INLINE_PDF_BYTES = 8 * 1024 * 1024;
const MAX_DOC_TEXT_CHARS = 15000;

export interface AttachmentContext {
  /** Parts multimodales à ajouter au dernier message utilisateur. */
  parts: AIContentPart[];
  /** Documents dont le texte a pu être extrait, à injecter dans le prompt. */
  docTexts: { name: string; text: string }[];
  /** Pièces jointes écartées, pour la trace de logs. */
  skipped: { name: string; reason: string }[];
}

/** N'accepte que les fichiers de notre propre bucket. */
function fromOurStorage(a: ParsedAttachment): boolean {
  return a.url.startsWith(STORAGE_PREFIX);
}

function dedupeByUrl(items: ParsedAttachment[]): ParsedAttachment[] {
  return [...new Map(items.map((i) => [i.url, i])).values()];
}

/**
 * Rassemble les pièces jointes du message courant et des messages précédents,
 * et prépare ce qui doit être transmis au modèle. Les pièces jointes de
 * l'historique sont incluses : sans cela, une photo envoyée au message N
 * disparaît du contexte au message N+1 et le modèle ne peut plus répondre aux
 * questions de suivi (« et sur le trou 4, je joue quoi ? »).
 */
export async function buildAttachmentContext(
  currentMessage: string,
  history: { role: string; content: string }[]
): Promise<AttachmentContext> {
  const current = parseAttachments(currentMessage);
  const previous = history
    .filter((m) => m.role === "user")
    .map((m) => parseAttachments(m.content));

  const imageCandidates = dedupeByUrl([
    ...previous.flatMap((p) => p.images),
    ...current.images,
  ])
    .filter(fromOurStorage)
    .slice(-IMAGE_CANDIDATES);

  const declaredDocs = dedupeByUrl([
    ...previous.flatMap((p) => p.docs),
    ...current.docs,
  ]).filter(fromOurStorage);

  const skipped: { name: string; reason: string }[] = [];

  // Vérification du contenu réel de chaque image avant envoi à l'API vision.
  const sniffed = await Promise.all(
    imageCandidates.map(async (img) => ({
      attachment: img,
      format: await sniffRemoteFormat(img.url),
    }))
  );

  const images: ParsedAttachment[] = [];
  const reclassifiedDocs: ParsedAttachment[] = [];
  for (const { attachment, format } of sniffed) {
    if (isVisionFormat(format)) {
      images.push(attachment);
    } else if (format === "pdf") {
      // Fichier stocké comme image mais qui est un PDF (export de carte de
      // parcours renommé, upload antérieur à la détection par signature).
      reclassifiedDocs.push({
        name: withFormatExtension(attachment.name, "pdf"),
        url: attachment.url,
      });
    } else {
      skipped.push({
        name: attachment.name,
        reason: format === "heic" ? "HEIC illisible" : "format non reconnu",
      });
    }
  }

  const docs = dedupeByUrl([...declaredDocs, ...reclassifiedDocs]).slice(
    -MAX_DOCS
  );

  const parts: AIContentPart[] = images.slice(-MAX_IMAGES).map((img) => ({
    type: "image_url" as const,
    image_url: { url: img.url, detail: "high" as const },
  }));

  const docTexts: { name: string; text: string }[] = [];

  await Promise.all(
    docs.map(async (doc) => {
      const text = await fetchDocText(doc.url);
      if (text) {
        docTexts.push({ name: doc.name, text });
        return;
      }
      // Pas de texte exploitable : PDF scanné (carte de parcours photographiée,
      // fiche d'exercice en image). Le modèle sait lire un PDF nativement.
      const inline = await fetchPdfAsDataUrl(doc.url);
      if (inline) {
        parts.push({
          type: "file",
          // Nom normalisé en .pdf : l'API refuse un document dont l'extension
          // contredit le contenu.
          file: { filename: withFormatExtension(doc.name, "pdf"), file_data: inline },
        });
      } else {
        skipped.push({ name: doc.name, reason: "PDF illisible ou trop lourd" });
      }
    })
  );

  return { parts, docTexts, skipped };
}

/** Lit les premiers octets du fichier stocké pour en déduire le vrai format. */
async function sniffRemoteFormat(url: string): Promise<FileFormat | null> {
  try {
    const res = await fetch(url, {
      headers: { Range: `bytes=0-${FORMAT_SNIFF_BYTES - 1}` },
    });
    if (!res.ok) return null;
    return detectFormat(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

async function fetchDocText(url: string): Promise<string | null> {
  try {
    const res = await fetch(`${url}.txt`);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.length >= MIN_USABLE_TEXT_LENGTH
      ? text.slice(0, MAX_DOC_TEXT_CHARS)
      : null;
  } catch {
    return null;
  }
}

async function fetchPdfAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_INLINE_PDF_BYTES) return null;
    return `data:application/pdf;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
