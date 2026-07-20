export type AIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  // string pour un message texte simple ; tableau de parts pour un message
  // multimodal (texte + images). OpenAI le consomme tel quel, Gemini l'aplatit
  // en texte.
  content: string | AIContentPart[];
}

export interface AIStreamConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  // Annulation de la génération (bouton Stop) : propagé jusqu'à l'appel HTTP
  // du provider pour arrêter la facturation et sauvegarder le partiel.
  signal?: AbortSignal;
}

export interface AIProvider {
  chat(messages: AIMessage[], config?: AIStreamConfig): Promise<string>;
  stream(messages: AIMessage[], config?: AIStreamConfig): Promise<ReadableStream<Uint8Array>>;
}
