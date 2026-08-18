import type { AIMessage, AIProvider, AIStreamConfig } from "./types";
import { serverEnv } from "@/lib/env";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Plafond de génération par défaut. Un plan d'entraînement mensuel complet
// dépasse largement les 2048 tokens historiques — 8192 laisse la place à des
// réponses longues et structurées sans coupure en plein milieu.
const DEFAULT_MAX_COMPLETION_TOKENS = 8192;

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = serverEnv("OPENAI_API_KEY")!;
    this.defaultModel = serverEnv("OPENAI_MODEL") || "gpt-5.5";
  }

  private buildBody(
    messages: AIMessage[],
    config: AIStreamConfig | undefined,
    stream: boolean
  ): Record<string, unknown> {
    const model = config?.model || this.defaultModel;
    const body: Record<string, unknown> = {
      model,
      messages,
      // `max_tokens` est refusé par les modèles gpt-5.x ; son remplaçant
      // `max_completion_tokens` est accepté par toute la gamme.
      max_completion_tokens: config?.maxTokens ?? DEFAULT_MAX_COMPLETION_TOKENS,
    };
    // Les modèles de raisonnement (gpt-5.x, o-série) n'acceptent que la
    // température par défaut — l'envoyer provoque une erreur 400.
    if (!/^(gpt-5|o\d)/.test(model)) {
      body.temperature = config?.temperature ?? 0.7;
    }
    if (stream) {
      body.stream = true;
    }
    return body;
  }

  async chat(messages: AIMessage[], config?: AIStreamConfig): Promise<string> {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(this.buildBody(messages, config, false)),
      signal: config?.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async stream(messages: AIMessage[], config?: AIStreamConfig): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(this.buildBody(messages, config, true)),
      signal: config?.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || "Unknown error"}`);
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
              if (trimmed === "data: [DONE]") {
                controller.close();
                return;
              }
              if (trimmed.startsWith("data: ")) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch {
                  // Skip malformed JSON lines
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
