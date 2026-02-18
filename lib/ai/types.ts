export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIStreamConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  chat(messages: AIMessage[], config?: AIStreamConfig): Promise<string>;
  stream(messages: AIMessage[], config?: AIStreamConfig): Promise<ReadableStream<Uint8Array>>;
}
