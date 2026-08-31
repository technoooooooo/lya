import type { SupabaseClient } from "@supabase/supabase-js";
import type { Offer } from "@/types/database";

/** Une offre est achetable si elle est active et dans sa fenêtre de vente. */
export function isOfferOnSale(offer: Offer, now = new Date()): boolean {
  if (!offer.is_active || !offer.stripe_price_id) return false;
  if (offer.available_from && new Date(offer.available_from) > now) return false;
  if (offer.available_until && new Date(offer.available_until) <= now) return false;
  return true;
}

export type EligibilityVerdict = { allowed: true } | { allowed: false; reason: string };

/**
 * Éligibilité d'un utilisateur à une offre restreinte. Plutôt qu'un champ de
 * statut à maintenir à la main, on lit l'historique des accès : « académie » =
 * accès Académie en cours, « alumni » = en a eu un un jour.
 */
export async function checkEligibility(
  supabase: SupabaseClient,
  userId: string,
  offer: Offer
): Promise<EligibilityVerdict> {
  if (offer.eligibility === "all") return { allowed: true };

  const query = supabase
    .from("access_grants")
    .select("id, ends_at", { count: "exact", head: false })
    .eq("user_id", userId)
    .eq("source", "academy");

  const { data } = await query;
  const grants = data ?? [];

  if (offer.eligibility === "alumni") {
    return grants.length > 0
      ? { allowed: true }
      : { allowed: false, reason: "Cette offre est réservée aux élèves de l'Académie." };
  }

  const active = grants.some((g) => !g.ends_at || new Date(g.ends_at) > new Date());
  return active
    ? { allowed: true }
    : { allowed: false, reason: "Cette offre est réservée aux membres de l'Académie en cours." };
}

/** Libellé de périodicité pour l'affichage (« / mois », « / 3 mois »). */
export function intervalLabel(offer: Offer): string | null {
  if (offer.mode !== "subscription" || !offer.recurring_interval) return null;

  const count = offer.recurring_interval_count;
  const units: Record<string, [string, string]> = {
    day: ["jour", "jours"],
    week: ["semaine", "semaines"],
    month: ["mois", "mois"],
    year: ["an", "ans"],
  };

  const [singular, plural] = units[offer.recurring_interval] ?? ["période", "périodes"];
  return count === 1 ? `/ ${singular}` : `/ ${count} ${plural}`;
}

export function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/**
 * Ce que l'offre donne, en clair. `access_duration` arrive de Postgres sous
 * forme d'intervalle sérialisé (« 12 mons », « 1 year »).
 */
export function accessLabel(offer: Offer): string {
  if (offer.access_kind === "lifetime") return "Accès à vie";
  if (offer.access_kind === "period") return "Tant que l'abonnement est actif";

  const duration = offer.access_duration ?? "";
  const units: Array<[RegExp, (n: number) => string]> = [
    [/(\d+)\s*year/i, (n) => (n === 1 ? "1 an" : `${n} ans`)],
    [/(\d+)\s*mon/i, (n) => `${n} mois`],
    [/(\d+)\s*week/i, (n) => (n === 1 ? "1 semaine" : `${n} semaines`)],
    [/(\d+)\s*day/i, (n) => (n === 1 ? "1 jour" : `${n} jours`)],
  ];

  const parts = units
    .map(([pattern, label]) => {
      const found = duration.match(pattern);
      return found ? label(parseInt(found[1], 10)) : null;
    })
    .filter(Boolean);

  return parts.length ? `Accès pendant ${parts.join(" et ")}` : "Accès limité";
}
