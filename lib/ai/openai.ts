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
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line === "data: [DONE]") {
            controller.close();
            return;
          }
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      },
    });
  }
}
