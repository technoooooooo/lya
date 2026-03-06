export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  pillar_id: string | null;
  pillar_name: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Pillar {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  pre_prompt: string;
  display_order: number;
  is_active: boolean;
}
