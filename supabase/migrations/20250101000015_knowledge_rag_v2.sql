-- RAG v2 : seuil de similarité, titre du document source dans les résultats,
-- et durcissement de l'accès direct à la base de connaissances.

-- 1) Nouvelle signature de match_knowledge_chunks (le type de retour change :
--    ajout du titre du document) → drop obligatoire.
drop function if exists public.match_knowledge_chunks(vector, integer);

-- security definer : la fonction lit les chunks avec les droits de son
-- propriétaire, ce qui permet de supprimer la lecture directe des tables de
-- connaissance par les utilisateurs (voir §2) tout en gardant le chat
-- fonctionnel. Le filtre is_active reste appliqué dans la fonction.
-- match_threshold : les chunks sous ce score de similarité sont considérés
-- hors sujet et ne sont pas injectés dans le prompt.
create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count integer default 6,
  match_threshold double precision default 0.25
)
returns table (
  id uuid,
  document_id uuid,
  file_id uuid,
  title text,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    kc.id,
    kc.document_id,
    kc.file_id,
    kd.title,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.knowledge_documents kd on kd.id = kc.document_id
  where kd.is_active = true
    and kc.embedding is not null
    and 1 - (kc.embedding <=> query_embedding) >= match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_knowledge_chunks(vector, integer, double precision) from public, anon;
grant execute on function public.match_knowledge_chunks(vector, integer, double precision) to authenticated, service_role;

-- 2) Le contenu de la base de connaissances (livres, méthode — propriété
--    intellectuelle du client) n'est plus lisible directement par les
--    utilisateurs via l'API : seul l'admin y accède (les policies
--    « Admin can manage … » FOR ALL couvrent déjà le SELECT), et le chat
--    passe par la RPC security definer ci-dessus.
drop policy "Authenticated users can read chunks of active documents" on public.knowledge_chunks;
drop policy "Authenticated users can read knowledge files of active documents" on public.knowledge_files;
drop policy "Authenticated users can read active knowledge documents" on public.knowledge_documents;

-- 3) Storage : lecture réservée à l'admin (les URLs signées ne sont générées
--    que dans les routes admin).
drop policy "Authenticated users can read knowledge storage files" on storage.objects;

create policy "Admin can read knowledge storage files"
  on storage.objects for select
  using (bucket_id = 'knowledge-files' and public.is_admin());
