import type { AIMessage, AIProvider, AIStreamConfig } from "./types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!;
    this.defaultModel = process.env.OPENAI_MODEL || "gpt-4o";
  }

  async chat(messages: AIMessage[], config?: AIStreamConfig): Promise<string> {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: config?.model || this.defaultModel,
        messages,
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 2048,
      }),
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
      body: JSON.stringify({
        model: config?.model || this.defaultModel,
        messages,
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 2048,
        stream: true,
      }),
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
          controller.error(error);
        }
      },
    });
  }
}
