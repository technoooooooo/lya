-- Suivi de l'indexation RAG des fichiers.
-- L'extraction PDF + la vectorisation passent désormais en tâche de fond
-- (après la réponse HTTP) pour encaisser les gros fichiers sans timeout, et
-- l'on trace l'état de l'indexation pour prévenir l'admin (ex. PDF scanné sans
-- texte extractible).

alter table public.knowledge_files
  add column indexing_status text not null default 'pending'
    check (indexing_status in ('pending', 'indexing', 'done', 'no_text', 'error')),
  add column indexing_error text,
  add column chunk_count integer not null default 0;

-- Backfill des fichiers existants (déjà traités par l'ancien flux synchrone).
update public.knowledge_files kf
set chunk_count = coalesce(
  (select count(*) from public.knowledge_chunks kc where kc.file_id = kf.id),
  0
);

-- Le bon signal d'indexation est la présence de chunks (chunk_count), pas
-- extracted_text : d'anciens fichiers correctement indexés peuvent avoir un
-- extracted_text null tout en ayant des chunks.
update public.knowledge_files
set indexing_status = case
  when chunk_count > 0 then 'done'
  when mime_type = 'application/pdf' then 'no_text'
  else 'done'
end;

-- Aligne la limite du bucket de stockage sur la validation applicative (50 Mo)
-- pour permettre l'upload de documents volumineux (ex. un livre entier).
update storage.buckets set file_size_limit = 52428800 where id = 'knowledge-files';
