// Lecture normalisée des variables d'environnement.
//
// Une valeur collée dans le dashboard Vercel embarque facilement un saut de
// ligne final. C'est invisible sur une clé d'API (les en-têtes HTTP sont
// normalisés à l'envoi) mais destructeur dès qu'une valeur sert à composer ou
// à comparer une URL : `${URL}/storage/...` devient `https://…co\n/storage/…`
// et toute comparaison de préfixe échoue silencieusement.
//
// Cas réel : les pièces jointes du chat n'étaient jamais transmises au modèle
// en production à cause d'un `\n` en fin de NEXT_PUBLIC_SUPABASE_URL. On lit
// donc toujours les variables via ce module.

// Accès statiques : Next.js n'inline les variables NEXT_PUBLIC_* dans le
// bundle navigateur que sous cette forme (pas via process.env[nom]).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

/**
 * Variable d'environnement serveur, débarrassée des espaces parasites.
 * Renvoie `undefined` si absente ou vide (côté navigateur, toujours
 * `undefined` : seules les variables NEXT_PUBLIC_* y sont exposées).
 */
export function serverEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/**
 * URL publique du site, pour les retours de paiement Stripe.
 * VERCEL_URL désigne l'URL du déploiement (lya-a1b2c3.vercel.app) et non le
 * domaine du client : elle ne sert que de repli en préproduction.
 */
export function siteUrl(): string {
  const configured = serverEnv("NEXT_PUBLIC_SITE_URL");
  if (configured) return configured.replace(/\/$/, "");

  const vercel = serverEnv("VERCEL_URL");
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
