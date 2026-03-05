-- Knowledge files table (one-to-many with knowledge_documents)
create table public.knowledge_files (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'application/pdf')),
  file_size integer not null,
  extracted_text text,
  created_at timestamptz not null default now()
);

create index idx_knowledge_files_document_id on public.knowledge_files(document_id);

alter table public.knowledge_files enable row level security;

create policy "Authenticated users can read knowledge files of active documents"
  on public.knowledge_files for select
  using (
    exists (
      select 1 from public.knowledge_documents
      where id = document_id and is_active = true
    )
  );

create policy "Admin can manage knowledge files"
  on public.knowledge_files for all
  using (public.is_admin());

-- Storage bucket for knowledge files (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-files',
  'knowledge-files',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'application/pdf']
);

-- Storage RLS policies
create policy "Admin can upload knowledge files"
  on storage.objects for insert
  with check (
    bucket_id = 'knowledge-files'
    and public.is_admin()
  );

create policy "Admin can update knowledge files"
  on storage.objects for update
  using (
    bucket_id = 'knowledge-files'
    and public.is_admin()
  );

create policy "Admin can delete knowledge files"
  on storage.objects for delete
  using (
    bucket_id = 'knowledge-files'
    and public.is_admin()
  );

create policy "Authenticated users can read knowledge storage files"
  on storage.objects for select
  using (
    bucket_id = 'knowledge-files'
    and auth.role() = 'authenticated'
  );
