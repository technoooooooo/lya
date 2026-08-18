import type { AIMessage, AIProvider, AIStreamConfig } from "./types";
import { serverEnv } from "@/lib/env";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Aligné sur le provider OpenAI : les plans d'entraînement complets demandent
// des réponses bien plus longues que les 2048 tokens historiques.
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = serverEnv("GEMINI_API_KEY")!;
    this.defaultModel = serverEnv("GEMINI_MODEL") || "gemini-2.0-flash";
  }

  // Gemini n'est pas branché en multimodal ici : un contenu en parts est
  // aplati en texte (les images deviennent une simple mention).
  private contentToText(content: AIMessage["content"]): string {
    if (typeof content === "string") return content;
    return content
      .map((part) => {
        if (part.type === "text") return part.text;
        if (part.type === "file") return `[document joint : ${part.file.filename}]`;
        return "[image jointe]";
      })
      .join("\n");
  }

  private toGeminiMessages(messages: AIMessage[]) {
    const systemInstruction = messages
      .filter((m) => m.role === "system")
      .map((m) => this.contentToText(m.content))
      .join("\n");

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: this.contentToText(m.content) }],
      }));

    return { systemInstruction, contents };
  }

  async chat(messages: AIMessage[], config?: AIStreamConfig): Promise<string> {
    const { systemInstruction, contents } = this.toGeminiMessages(messages);
    const model = config?.model || this.defaultModel;

    const response = await fetch(
      `${GEMINI_API_URL}/${model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: config?.signal,
        body: JSON.stringify({
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents,
          generationConfig: {
            temperature: config?.temperature ?? 0.7,
            maxOutputTokens: config?.maxTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${error.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async stream(messages: AIMessage[], config?: AIStreamConfig): Promise<ReadableStream<Uint8Array>> {
    const { systemInstruction, contents } = this.toGeminiMessages(messages);
    const model = config?.model || this.defaultModel;

    const response = await fetch(
      `${GEMINI_API_URL}/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: config?.signal,
        body: JSON.stringify({
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents,
          generationConfig: {
            temperature: config?.temperature ?? 0.7,
            maxOutputTokens: config?.maxTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${error.error?.message || "Unknown error"}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Keep the last (potentially incomplete) line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed.startsWith("data: ")) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        } catch (error) {
          // Annulation volontaire (bouton Stop) : fermer proprement pour que
          // le fork de sauvegarde enregistre la réponse partielle déjà reçue.
          if (config?.signal?.aborted) {
            controller.close();
          } else {
            controller.error(error);
          }
        }
      },
    });
  }
}
