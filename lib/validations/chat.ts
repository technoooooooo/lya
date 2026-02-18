import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1, "Le message ne peut pas être vide").max(4000, "Message trop long"),
  pillarId: z.string().uuid().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
