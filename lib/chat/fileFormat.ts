// Reconnaissance du format d'un fichier d'après sa signature binaire (magic
// bytes), et non d'après son extension ou le type MIME annoncé par le
// navigateur — les deux mentent régulièrement (carte de parcours exportée en
// PDF puis renommée « .jpg », photo iPhone en HEIC déguisée en .jpg).
//
// Utilisé à l'upload (app/api/chat/uploads) pour décider comment stocker le
// fichier, et à la construction du contexte modèle (lib/chat/attachmentContext)
// pour vérifier ce qui est réellement envoyé à l'API vision.

export type FileFormat = "pdf" | "jpeg" | "png" | "gif" | "webp" | "heic";

/** Nombre d'octets suffisant pour identifier tous les formats reconnus. */
export const FORMAT_SNIFF_BYTES = 16;

export const FORMAT_META: Record<
  FileFormat,
  { mime: string; ext: string; kind: "image" | "document" }
> = {
  pdf: { mime: "application/pdf", ext: "pdf", kind: "document" },
  jpeg: { mime: "image/jpeg", ext: "jpg", kind: "image" },
  png: { mime: "image/png", ext: "png", kind: "image" },
  gif: { mime: "image/gif", ext: "gif", kind: "image" },
  webp: { mime: "image/webp", ext: "webp", kind: "image" },
  // Photos iPhone : stockables mais illisibles par l'API vision — on les
  // refuse à l'upload avec un message explicite.
  heic: { mime: "image/heic", ext: "heic", kind: "image" },
};

/** Formats d'image acceptés par l'API vision d'OpenAI. */
const VISION_FORMATS: FileFormat[] = ["jpeg", "png", "gif", "webp"];

export function isVisionFormat(format: FileFormat | null): boolean {
  return format !== null && VISION_FORMATS.includes(format);
}

export function detectFormat(buffer: Buffer): FileFormat | null {
  const startsWith = (...bytes: number[]) =>
    bytes.every((b, i) => buffer[i] === b);

  if (startsWith(0x25, 0x50, 0x44, 0x46)) return "pdf";
  if (startsWith(0xff, 0xd8, 0xff)) return "jpeg";
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (buffer.subarray(0, 3).toString("ascii") === "GIF") return "gif";
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp";

  // Conteneur ISO-BMFF (« ftyp ») portant une marque HEIC/HEIF.
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (
      ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(
        brand
      )
    )
      return "heic";
  }

  return null;
}

/** Remplace l'extension d'un nom de fichier par celle du format détecté. */
export function withFormatExtension(name: string, format: FileFormat): string {
  const { ext } = FORMAT_META[format];
  if (name.toLowerCase().endsWith(`.${ext}`)) return name;
  return `${name.replace(/\.[^.]+$/, "")}.${ext}`;
}
