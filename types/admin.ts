export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  file_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeFile {
  id: string;
  document_id: string;
  file_name: string;
  storage_path: string;
  mime_type: "image/png" | "image/jpeg" | "application/pdf";
  file_size: number;
  extracted_text: string | null;
  indexing_status: "pending" | "indexing" | "done" | "no_text" | "error";
  indexing_error: string | null;
  chunk_count: number;
  created_at: string;
}

export interface KnowledgeDocumentWithFiles extends KnowledgeDocument {
  knowledge_files: KnowledgeFile[];
}

export interface KnowledgeChunk {
  id: string;
  file_id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  created_at: string;
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
