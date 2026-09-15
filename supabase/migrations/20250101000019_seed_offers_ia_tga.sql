-- Pont avec le produit Stripe créé par le client (compte clickandgolf.fr, mode live) :
--   IA TGA – Ton Coach Golf IA  →  prod_VEDBpzccoVjGpK
--     29 € / mois   →  price_1UDklSGetb1yYRPfGnnr6NXM (prix par défaut)
--     249 € / an    →  price_1UDkmMGetb1yYRPfjz7jItCB
--
-- Le webhook n'ouvre un accès que pour un price présent dans offers (le compte
-- est partagé avec systeme.io) et le Checkout ne vend que ce qui s'y trouve :
-- ces deux lignes sont donc le seul lien entre l'app et le produit Stripe.
--
-- Les trois offres « demo_* » posées le 26/08/2026 pointent sur des prix Stripe
-- en MODE TEST (prod_V8eW…) : avec la clé live, leur Checkout échouerait. Elles
-- sont désactivées (jamais supprimées : un grant peut les référencer) et
-- reléguées en fin de liste. Pour tester le parcours en local avec la clé test,
-- les réactiver à la main.
--
-- Les deux offres donnent un accès « period » : calé sur la période Stripe,
-- repoussé à chaque renouvellement, conservé jusqu'au terme payé en cas de
-- résiliation. L'insertion est idempotente (rejouable sans doublon).

update public.offers
set is_active = false, display_order = 90 + display_order
where internal_name in ('demo_mensuel', 'demo_annuel', 'demo_lifetime')
  and is_active;

insert into public.offers (
  internal_name, display_name, description,
  stripe_product_id, stripe_price_id,
  mode, recurring_interval, recurring_interval_count,
  amount_cents, currency, compare_at_cents,
  access_kind, visibility, eligibility, is_active, display_order
)
select
  'ia_tga_mensuel',
  'IA TGA – Mensuel',
  'Ton coach golf IA personnel, disponible 24h/24. Sans engagement, résiliable à tout moment.',
  'prod_VEDBpzccoVjGpK', 'price_1UDklSGetb1yYRPfGnnr6NXM',
  'subscription', 'month', 1,
  2900, 'eur', null,
  'period', 'public', 'all', true, 1
where not exists (
  select 1 from public.offers where stripe_price_id = 'price_1UDklSGetb1yYRPfGnnr6NXM'
);

insert into public.offers (
  internal_name, display_name, description,
  stripe_product_id, stripe_price_id,
  mode, recurring_interval, recurring_interval_count,
  amount_cents, currency, compare_at_cents,
  access_kind, visibility, eligibility, is_active, display_order
)
select
  'ia_tga_annuel',
  'IA TGA – Annuel',
  'Ton coach golf IA personnel, disponible 24h/24. Facturé une fois par an.',
  'prod_VEDBpzccoVjGpK', 'price_1UDkmMGetb1yYRPfjz7jItCB',
  'subscription', 'year', 1,
  24900, 'eur', 34800, -- 12 × 29 € : le prix mensuel ramené à l'année
  'period', 'public', 'all', true, 2
where not exists (
  select 1 from public.offers where stripe_price_id = 'price_1UDkmMGetb1yYRPfjz7jItCB'
);
