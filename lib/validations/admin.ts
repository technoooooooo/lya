import { z } from "zod";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "application/pdf"] as const;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 Mo

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
    return { valid: false, error: "Fichier trop volumineux (maximum 50 Mo)" };
  }
  if (file.size === 0) {
    return { valid: false, error: "Fichier vide" };
  }
  return { valid: true, error: null };
}

export const createKnowledgeDocumentSchema = z.object({
  title: z.string().trim().min(1, "Titre requis"),
  content: z.string().optional().default(""),
});

export const updateKnowledgeDocumentSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").optional(),
  content: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const createGuardrailSchema = z.object({
  type: z.enum(["forbidden", "exception"], { message: "Type invalide (forbidden ou exception)" }),
  subject: z.string().trim().min(1, "Sujet requis"),
  description: z.string().nullable().optional(),
});

export const updateGuardrailSchema = z.object({
  type: z.enum(["forbidden", "exception"], { message: "Type invalide (forbidden ou exception)" }).optional(),
  subject: z.string().trim().min(1, "Sujet requis").optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});
