import type { AIMessage, AIProvider, AIStreamConfig } from "./types";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY!;
    this.defaultModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  }

  private toGeminiMessages(messages: AIMessage[]) {
    const systemInstruction = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
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
        body: JSON.stringify({
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents,
          generationConfig: {
            temperature: config?.temperature ?? 0.7,
            maxOutputTokens: config?.maxTokens ?? 2048,
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
        body: JSON.stringify({
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents,
          generationConfig: {
            temperature: config?.temperature ?? 0.7,
            maxOutputTokens: config?.maxTokens ?? 2048,
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
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      },
    });
  }
}
