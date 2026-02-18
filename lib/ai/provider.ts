import type { AIProvider } from "./types";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (providerInstance) return providerInstance;

  const providerName = process.env.AI_PROVIDER || "openai";

  switch (providerName) {
    case "gemini":
      providerInstance = new GeminiProvider();
      break;
    case "openai":
    default:
      providerInstance = new OpenAIProvider();
      break;
  }

  return providerInstance;
}
