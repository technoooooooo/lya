import type { AIMessage } from "./types";
import { createClient } from "@/lib/supabase/server";

export async function buildSystemPrompt(pillarPrePrompt?: string, userName?: string): Promise<string> {
  const supabase = await createClient();

  // Get main system prompt from ai_config
  const { data: config } = await supabase
    .from("ai_config")
    .select("value")
    .eq("key", "system_prompt")
    .single();

  const systemPrompt = config?.value || "Tu es Lya, assistant IA dédié au coaching golf.";

  // Get active knowledge documents with extracted file text
  const { data: docs } = await supabase
    .from("knowledge_documents")
    .select("title, content, knowledge_files(extracted_text)")
    .eq("is_active", true);

  // Get active guardrails
  const { data: guardrails } = await supabase
    .from("guardrails")
    .select("type, subject, description")
    .eq("is_active", true);

  let fullPrompt = systemPrompt;

  // Add identity and user context
  fullPrompt += `\n\n## Identité\nTu es Mathieu, coach de golf. Tu parles en ton propre nom, en tant que Mathieu. Tu ne dois jamais dire que tu es une IA ou un assistant virtuel.`;
  if (userName) {
    fullPrompt += `\n\n## Utilisateur actuel\nL'utilisateur qui te parle s'appelle ${userName}. Adresse-toi à lui/elle par son prénom.`;
  }

  // Add pillar-specific pre-prompt if provided
  if (pillarPrePrompt) {
    fullPrompt += `\n\n## Contexte du pilier\n${pillarPrePrompt}`;
  }

  // Add knowledge base context
  if (docs && docs.length > 0) {
    fullPrompt += "\n\n## Base de connaissances\nUtilise exclusivement les informations suivantes pour répondre :\n";
    for (const doc of docs) {
      fullPrompt += `\n### ${doc.title}\n${doc.content}\n`;
      // Append extracted text from PDF files
      const files = (doc as Record<string, unknown>).knowledge_files as
        | { extracted_text: string | null }[]
        | undefined;
      if (files) {
        for (const file of files) {
          if (file.extracted_text) {
            fullPrompt += `\n${file.extracted_text}\n`;
          }
        }
      }
    }
  }

  // Add guardrails
  if (guardrails && guardrails.length > 0) {
    const forbidden = guardrails.filter((g) => g.type === "forbidden");
    const exceptions = guardrails.filter((g) => g.type === "exception");

    if (forbidden.length > 0) {
      fullPrompt += "\n\n## Sujets interdits\nTu dois refuser poliment de répondre sur ces sujets et rediriger vers les 5 piliers :\n";
      for (const g of forbidden) {
        fullPrompt += `- ${g.subject}${g.description ? ` : ${g.description}` : ""}\n`;
      }
    }

    if (exceptions.length > 0) {
      fullPrompt += "\n\n## Exceptions autorisées\nTu peux aborder ces sujets dans le cadre défini :\n";
      for (const g of exceptions) {
        fullPrompt += `- ${g.subject}${g.description ? ` : ${g.description}` : ""}\n`;
      }
    }
  }

  return fullPrompt;
}

export function buildMessages(
  systemPrompt: string,
  conversationHistory: { role: string; content: string }[],
  userMessage: string
): AIMessage[] {
  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role as AIMessage["role"],
      content: msg.content,
    });
  }

  // Add new user message
  messages.push({ role: "user", content: userMessage });

  return messages;
}
