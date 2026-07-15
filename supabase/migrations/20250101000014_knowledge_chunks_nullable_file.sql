-- Un chunk peut désormais provenir du `content` d'un knowledge_document
-- (et non uniquement d'un fichier uploadé). On autorise donc file_id nul.
alter table public.knowledge_chunks
  alter column file_id drop not null;
