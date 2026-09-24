-- Codes d'accès gérés depuis l'admin.
--
-- access_days : durée de l'accès ouvert par le code (null = sans terme, comme
--   les codes historiques). label : libellé libre (« Promo stage Marrakech »).
-- access_grants.promo_code_id : quel code a ouvert quel accès — le suivi des
--   utilisations ne dépend plus du texte de la note.
alter table public.promo_codes
  add column if not exists access_days integer check (access_days is null or access_days > 0),
  add column if not exists label text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.access_grants
  add column if not exists promo_code_id uuid references public.promo_codes(id) on delete set null;

create index if not exists idx_access_grants_promo_code
  on public.access_grants(promo_code_id)
  where promo_code_id is not null;

-- Activité par utilisateur pour la liste admin, en une requête (un select côté
-- client plafonnerait à 1 000 messages). Réservé à la clé de service.
create or replace function public.admin_user_activity()
returns table (
  user_id uuid,
  conversations bigint,
  user_messages bigint,
  last_message_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.user_id,
    count(distinct c.id) as conversations,
    count(m.id) filter (where m.role = 'user') as user_messages,
    max(m.created_at) filter (where m.role = 'user') as last_message_at
  from public.conversations c
  left join public.messages m on m.conversation_id = c.id
  group by c.user_id;
$$;

revoke execute on function public.admin_user_activity() from public, anon, authenticated;
