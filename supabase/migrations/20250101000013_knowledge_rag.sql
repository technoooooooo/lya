-- RAG : vectorisation de la base de connaissance (pgvector)

-- Extension pgvector
create extension if not exists vector;

-- Table des chunks vectorisés (issus des fichiers de la base de connaissance)
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.knowledge_files(id) on delete cascade,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index idx_knowledge_chunks_file_id on public.knowledge_chunks(file_id);
create index idx_knowledge_chunks_document_id on public.knowledge_chunks(document_id);

-- Index de similarité cosine (HNSW)
create index idx_knowledge_chunks_embedding
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.knowledge_chunks enable row level security;

-- RLS calquée sur knowledge_files : lecture si document actif, gestion admin
create policy "Authenticated users can read chunks of active documents"
  on public.knowledge_chunks for select
  using (
    exists (
      select 1 from public.knowledge_documents
      where id = document_id and is_active = true
    )
  );

create policy "Admin can manage knowledge chunks"
  on public.knowledge_chunks for all
  using (public.is_admin());

-- Recherche par similarité cosine, restreinte aux documents actifs.
-- security invoker : la RLS ci-dessus s'applique (pas de fuite de contenu désactivé).
create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count integer default 6
)
returns table (
  id uuid,
  document_id uuid,
  file_id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
as $$
  select
    kc.id,
    kc.document_id,
    kc.file_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.knowledge_documents kd on kd.id = kc.document_id
  where kd.is_active = true
    and kc.embedding is not null
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

-- Passage de la limite du bucket de 10 Mo à 50 Mo (livres volumineux)
update storage.buckets
  set file_size_limit = 52428800
  where id = 'knowledge-files';
