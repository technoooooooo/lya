-- Les index uniques d'access_grants étaient partiels (`where … is not null`).
-- Un `insert … on conflict (colonne)` ne sait pas inférer un index partiel sans
-- répéter sa clause WHERE, ce que PostgREST ne fait pas : chaque upsert du
-- webhook échouait sur « no unique or exclusion constraint matching the ON
-- CONFLICT specification », et l'abonnement payé n'ouvrait aucun accès.
--
-- Un index unique complet convient : Postgres traite les NULL comme distincts,
-- les grants sans identifiant Stripe (Académie, geste commercial) restent donc
-- libres de coexister.

drop index if exists public.idx_access_grants_subscription;
drop index if exists public.idx_access_grants_payment_intent;

create unique index idx_access_grants_subscription
  on public.access_grants(stripe_subscription_id);

create unique index idx_access_grants_payment_intent
  on public.access_grants(stripe_payment_intent_id);
