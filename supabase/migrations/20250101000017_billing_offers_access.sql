-- Socle commercial : offres, droits d'accès, idempotence des webhooks Stripe.
--
-- Principe : Stripe reste la source de vérité du catalogue et de l'encaissement,
-- Lya est la source de vérité du DROIT D'ACCÈS. Les quatre notions du cahier des
-- charges sont séparées :
--
--   auth.users  →  access_grants  →  offers  →  Stripe (product/price/subscription)
--   utilisateur    droit d'accès     offre      paiement
--
-- Le point central : l'accès est une DATE, pas un statut booléen. C'est ce qui
-- permet d'exprimer sans cas particulier « résilié mais payé jusqu'au 30 »,
-- « impayé en cours de relance », « offert par l'Académie jusqu'en mars » et
-- « lifetime » avec une seule règle de lecture.

-- ---------------------------------------------------------------------------
-- 1) offers — façade locale du catalogue Stripe
-- ---------------------------------------------------------------------------
-- Les colonnes stripe_* sont renseignées à la création de l'offre, quand le
-- back-office crée le Product et le Price via l'API. Les colonnes qui suivent
-- (visibilité, fenêtre de disponibilité, éligibilité) sont les seules notions
-- que Stripe ne sait pas porter : elles justifient à elles seules cette table.

create table public.offers (
  id uuid primary key default gen_random_uuid(),

  internal_name text not null,
  display_name text not null,
  description text,

  -- Miroir Stripe. Un Price étant immuable, un changement de tarif crée un
  -- nouveau price_id : les abonnements en cours restent sur l'ancien.
  stripe_product_id text,
  stripe_price_id text,

  mode text not null check (mode in ('subscription', 'payment')),

  -- Périodicité au format Stripe (trimestriel = month × 3, semestriel = month × 6).
  recurring_interval text check (recurring_interval in ('day', 'week', 'month', 'year')),
  recurring_interval_count integer not null default 1 check (recurring_interval_count > 0),
  trial_days integer check (trial_days is null or trial_days > 0),

  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'eur',
  compare_at_cents integer check (compare_at_cents is null or compare_at_cents >= 0),

  -- Droit conféré par l'offre.
  --   'period'   : calé sur la période Stripe (abonnement, repoussé à chaque paiement)
  --   'duration' : durée fixe à partir de l'activation (access_duration)
  --   'lifetime' : sans terme
  access_kind text not null check (access_kind in ('period', 'duration', 'lifetime')),
  access_duration interval,

  visibility text not null default 'public' check (visibility in ('public', 'private')),
  slug text unique,

  eligibility text not null default 'all' check (eligibility in ('all', 'alumni', 'academy')),

  available_from timestamptz,
  available_until timestamptz,

  is_active boolean not null default true,
  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint offers_subscription_needs_interval check (
    (mode = 'subscription' and recurring_interval is not null)
    or (mode = 'payment' and recurring_interval is null)
  ),
  constraint offers_duration_needs_value check (
    access_kind <> 'duration' or access_duration is not null
  ),
  constraint offers_period_needs_subscription check (
    access_kind <> 'period' or mode = 'subscription'
  ),
  constraint offers_private_needs_slug check (
    visibility <> 'private' or slug is not null
  ),
  constraint offers_window_ordered check (
    available_from is null or available_until is null or available_until > available_from
  )
);

create unique index idx_offers_stripe_price_id
  on public.offers(stripe_price_id)
  where stripe_price_id is not null;
create index idx_offers_active on public.offers(is_active, visibility, display_order);

create trigger on_offers_updated
  before update on public.offers
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 2) access_grants — source de vérité du droit d'accès
-- ---------------------------------------------------------------------------
-- Un abonnement Stripe = un seul grant dont ends_at est repoussé à chaque
-- renouvellement (l'historique des paiements reste chez Stripe). Un paiement
-- unique, un accès Académie ou un geste commercial = un grant de plus. Les
-- grants se cumulent : l'accès effectif est le plus lointain d'entre eux.

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  source text not null check (
    source in ('stripe_subscription', 'stripe_payment', 'academy', 'manual', 'promo')
  ),
  offer_id uuid references public.offers(id) on delete set null,

  stripe_subscription_id text,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,

  starts_at timestamptz not null default now(),
  ends_at timestamptz,          -- null = sans terme (lifetime, accès offert sans date)
  revoked_at timestamptz,       -- coupure explicite, prioritaire sur ends_at

  -- 'past_due' : l'abonnement est en cours de relance Stripe. L'accès est
  -- maintenu (ends_at porte la fin du délai de grâce), un bandeau prévient.
  payment_state text not null default 'ok' check (payment_state in ('ok', 'past_due')),

  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_access_grants_user on public.access_grants(user_id, ends_at);
create unique index idx_access_grants_subscription
  on public.access_grants(stripe_subscription_id)
  where stripe_subscription_id is not null;
create unique index idx_access_grants_payment_intent
  on public.access_grants(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create trigger on_access_grants_updated
  before update on public.access_grants
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 3) stripe_events — idempotence des webhooks
-- ---------------------------------------------------------------------------
-- Stripe peut livrer deux fois le même événement (retry après timeout). La
-- clé primaire sur l'id de l'événement suffit à ne le traiter qu'une fois.

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  handled_at timestamptz,
  error text
);

create index idx_stripe_events_received on public.stripe_events(received_at desc);

-- ---------------------------------------------------------------------------
-- 4) Dénormalisation sur profiles — le gate du chat doit rester une requête
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column access_until timestamptz,
  add column has_lifetime_access boolean not null default false,
  add column access_source text,
  add column payment_state text not null default 'ok'
    check (payment_state in ('ok', 'past_due'));

-- subscription_status reste alimenté pour l'UI existante, mais devient une
-- valeur DÉRIVÉE des grants. Le type TS prévoyait déjà 'past_due' que la
-- contrainte d'origine refusait : tout UPDATE d'un impayé échouait, le webhook
-- répondait 500 et Stripe retentait pendant trois jours.
alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;
alter table public.profiles
  add constraint profiles_subscription_status_check
    check (subscription_status in ('active', 'inactive', 'past_due'));

-- Recalcule l'accès effectif d'un utilisateur depuis ses grants.
create or replace function public.refresh_user_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lifetime boolean;
  v_until timestamptz;
  v_source text;
  v_state text;
begin
  select
    bool_or(g.ends_at is null),
    max(g.ends_at),
    (array_agg(g.source order by g.ends_at desc nulls first))[1],
    case when bool_or(g.payment_state = 'past_due') then 'past_due' else 'ok' end
  into v_lifetime, v_until, v_source, v_state
  from public.access_grants g
  where g.user_id = p_user_id
    and g.revoked_at is null
    and (g.ends_at is null or g.ends_at > now());

  update public.profiles
  set
    has_lifetime_access = coalesce(v_lifetime, false),
    access_until = case when coalesce(v_lifetime, false) then null else v_until end,
    access_source = v_source,
    payment_state = coalesce(v_state, 'ok'),
    subscription_status = case
      when coalesce(v_lifetime, false) or v_until > now() then
        case when v_state = 'past_due' then 'past_due' else 'active' end
      else 'inactive'
    end
  where user_id = p_user_id;
  -- subscription_type n'est plus dérivé : access_source dit précisément d'où
  -- vient l'accès (abonnement, paiement unique, Académie, geste commercial),
  -- là où subscription_type ne sait exprimer que « payant » ou « promo ».

end;
$$;

create or replace function public.on_access_grant_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_access(coalesce(new.user_id, old.user_id));
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    perform public.refresh_user_access(old.user_id);
  end if;
  return null;
end;
$$;

create trigger on_access_grants_refresh
  after insert or update or delete on public.access_grants
  for each row execute function public.on_access_grant_changed();

-- Lecture unique de l'accès, utilisable en RLS comme depuis l'application.
create or replace function public.has_lya_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and p.is_active
      and (p.has_lifetime_access or p.access_until > now())
  );
$$;

-- ---------------------------------------------------------------------------
-- 5) Reprise de l'existant — sans grant, les abonnés actuels perdraient l'accès
-- ---------------------------------------------------------------------------

insert into public.access_grants (user_id, source, starts_at, ends_at, note)
select
  p.user_id,
  case when p.subscription_type = 'promo' then 'promo' else 'manual' end,
  coalesce(p.created_at, now()),
  null,
  'Repris de subscription_status lors de la migration vers access_grants'
from public.profiles p
where p.subscription_status = 'active';

-- ---------------------------------------------------------------------------
-- 6) RLS
-- ---------------------------------------------------------------------------

alter table public.offers enable row level security;
alter table public.access_grants enable row level security;
alter table public.stripe_events enable row level security;

-- Les offres publiques et disponibles sont lisibles par tout utilisateur
-- connecté ; les offres privées ne le sont que par leur slug, résolu côté
-- serveur (route dédiée), jamais par un listing client.
create policy "Utilisateurs : offres publiques actives"
  on public.offers for select
  to authenticated
  using (
    is_active
    and visibility = 'public'
    and (available_from is null or available_from <= now())
    and (available_until is null or available_until > now())
  );

create policy "Admin : gestion des offres"
  on public.offers for all
  using (public.is_admin());

create policy "Utilisateurs : lecture de ses propres accès"
  on public.access_grants for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admin : gestion des accès"
  on public.access_grants for all
  using (public.is_admin());

-- stripe_events : aucune policy — seule la clé de service (webhook) y accède.

-- ---------------------------------------------------------------------------
-- 7) Résolution d'un utilisateur par email (rattrapage webhook)
-- ---------------------------------------------------------------------------
-- Le chemin nominal reste client_reference_id, posé par l'app à la création de
-- la session Checkout. Cette fonction ne sert qu'au rattrapage d'un paiement
-- effectué hors du parcours applicatif. Le code précédent interrogeait
-- profiles.email — colonne qui n'a jamais existé : le rattrapage échouait
-- silencieusement à chaque fois.
create or replace function public.user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke execute on function public.user_id_by_email(text) from anon, authenticated;
