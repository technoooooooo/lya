import type { AccessSource, PaymentState } from "@/types/database";

/**
 * Vue minimale d'un profil suffisante pour statuer sur l'accès. Les colonnes
 * sont dérivées des access_grants par trigger (migration 017) : on ne lit
 * jamais subscription_status pour décider, seulement pour afficher.
 */
export interface AccessFields {
  is_active?: boolean | null;
  access_until?: string | null;
  has_lifetime_access?: boolean | null;
  access_source?: AccessSource | null;
  payment_state?: PaymentState | null;
}

/** Jours de tolérance affichés à l'utilisateur pendant les relances Stripe. */
export const DUNNING_GRACE_DAYS = 21;

/**
 * L'accès est une date, pas un statut : un abonné résilié garde son accès
 * jusqu'à la fin de la période déjà payée, un impayé le garde jusqu'à la fin
 * des relances, un lifetime n'a pas de terme. `is_active` reste le coupe-circuit
 * administrateur, indépendant de toute notion commerciale.
 */
export function hasActiveAccess(profile: AccessFields | null | undefined): boolean {
  if (!profile) return false;
  if (profile.is_active === false) return false;
  if (profile.has_lifetime_access) return true;
  if (!profile.access_until) return false;
  return new Date(profile.access_until).getTime() > Date.now();
}

/** Nombre de jours entiers restants, null si lifetime ou sans accès. */
export function daysRemaining(profile: AccessFields | null | undefined): number | null {
  if (!profile?.access_until || profile.has_lifetime_access) return null;
  const ms = new Date(profile.access_until).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/**
 * Un paiement a échoué et Stripe est en cours de relance. L'accès est maintenu
 * (décision client : ne pas couper avant la fin des trois semaines de
 * relances), mais l'utilisateur doit être prévenu.
 */
export function isPaymentAtRisk(profile: AccessFields | null | undefined): boolean {
  return Boolean(profile && profile.payment_state === "past_due" && hasActiveAccess(profile));
}

/** Libellé court de la provenance de l'accès, pour l'UI et l'admin. */
export function accessSourceLabel(source: AccessSource | null | undefined): string {
  switch (source) {
    case "stripe_subscription":
      return "Abonnement";
    case "stripe_payment":
      return "Paiement unique";
    case "academy":
      return "Académie";
    case "manual":
      return "Accès accordé";
    case "promo":
      return "Code promo";
    default:
      return "Aucun accès";
  }
}
