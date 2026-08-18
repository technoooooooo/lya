import type { AIProvider } from "./types";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { serverEnv } from "@/lib/env";

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (providerInstance) return providerInstance;

  const providerName = serverEnv("AI_PROVIDER") || "openai";

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
