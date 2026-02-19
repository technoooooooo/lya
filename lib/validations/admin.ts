const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "application/pdf"] as const;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function validateFile(file: { type: string; size: number }): {
  valid: boolean;
  error: string | null;
} {
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: "Type de fichier non supporté. Formats acceptés : PNG, JPG, PDF",
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "Fichier trop volumineux (maximum 10 Mo)" };
  }
  if (file.size === 0) {
    return { valid: false, error: "Fichier vide" };
  }
  return { valid: true, error: null };
}
