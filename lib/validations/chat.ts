import { z } from "zod";

// Assez large pour un plan d'entraînement complet collé depuis Notion, tout en
// bornant le coût d'un appel modèle. Partagé entre la validation serveur, la
// troncature des guardrails et le compteur du champ de saisie côté client.
export const MAX_MESSAGE_LENGTH = 30000;

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z
    .string()
    .min(1, "Le message ne peut pas être vide")
    .max(MAX_MESSAGE_LENGTH, "Message trop long (maximum 30 000 caractères)"),
  pillarId: z.string().uuid().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
