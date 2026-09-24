-- Les codes d'accès ne sont plus lus que côté serveur (route /api/auth/signup,
-- clé de service). La policy d'origine « using (true) » rendait la liste
-- complète des codes lisible par n'importe quel visiteur via l'API publique.
drop policy if exists "Anyone can check promo codes" on public.promo_codes;
