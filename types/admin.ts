export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  file_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Guardrail {
  id: string;
  type: 'forbidden' | 'exception';
  subject: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIConfig {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}
