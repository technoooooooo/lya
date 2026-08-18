export type AIContentPart =
  | { type: "text"; text: string }
  // `detail: "high"` force la lecture en pleine résolution : sans lui, les
  // petits caractères d'une carte de score ou d'une carte de parcours peuvent
  // être illisibles pour le modèle.
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
  // Document envoyé tel quel au modèle (PDF), en data URL base64. Utilisé pour
  // les PDF sans texte extractible — le modèle en lit alors les pages.
  | { type: "file"; file: { filename: string; file_data: string } };

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
