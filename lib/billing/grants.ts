import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Offer, AccessSource } from "@/types/database";
import { DUNNING_GRACE_DAYS } from "./access";

/**
 * Écriture des droits d'accès depuis les traitements sans session utilisateur
 * (webhooks). Toutes les fonctions sont idempotentes : rejouer un événement
 * Stripe ne crée jamais de doublon.
 */

/**
 * Le compte Stripe de clickandgolf.fr est partagé avec systeme.io : sans ce
 * filtre, une vente de formation ouvrirait un accès à Lya. Une offre n'est
 * reconnue que si son price figure dans la table offers.
 */
export async function findOfferByPriceId(priceId: string | null): Promise<Offer | null> {
  if (!priceId) return null;

  const { data } = await getSupabaseAdmin()
    .from("offers")
    .select("*")
    .eq("stripe_price_id", priceId)
    .maybeSingle();

  return (data as Offer | null) ?? null;
}

interface UserLookup {
  clientReferenceId?: string | null;
  metadataUserId?: string | null;
  stripeCustomerId?: string | null;
  email?: string | null;
}

/**
 * Retrouve le compte Lya derrière un événement Stripe. Le chemin nominal est
 * client_reference_id, posé par l'app à la création de la session Checkout ;
 * les suivants ne sont que des rattrapages.
 */
export async function resolveUserId(lookup: UserLookup): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  if (lookup.clientReferenceId) return lookup.clientReferenceId;
  if (lookup.metadataUserId) return lookup.metadataUserId;

  if (lookup.stripeCustomerId) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", lookup.stripeCustomerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  if (lookup.email) {
    const { data } = await supabase.rpc("user_id_by_email", { p_email: lookup.email });
    if (data) return data as string;
  }

  return null;
}

/** Mémorise le client Stripe sur le profil, pour le portail de facturation. */
export async function linkStripeCustomer(userId: string, customerId: string | null) {
  if (!customerId) return;
  await getSupabaseAdmin()
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("user_id", userId);
}

/** Ajoute une durée d'offre (interval Postgres sérialisé) à une date. */
function addAccessDuration(from: Date, duration: string | null): Date | null {
  if (!duration) return null;

  const result = new Date(from);
  const units: Array<[RegExp, (n: number) => void]> = [
    [/(\d+)\s*year/i, (n) => result.setFullYear(result.getFullYear() + n)],
    [/(\d+)\s*mon/i, (n) => result.setMonth(result.getMonth() + n)],
    [/(\d+)\s*day/i, (n) => result.setDate(result.getDate() + n)],
    [/(\d+)\s*week/i, (n) => result.setDate(result.getDate() + n * 7)],
  ];

  let matched = false;
  for (const [pattern, apply] of units) {
    const found = duration.match(pattern);
    if (found) {
      apply(parseInt(found[1], 10));
      matched = true;
    }
  }

  return matched ? result : null;
}

interface SubscriptionGrantInput {
  userId: string;
  offer: Offer | null;
  subscriptionId: string;
  periodEnd: Date | null;
  pastDue?: boolean;
}

/**
 * Un abonnement Stripe correspond à un grant unique dont la date de fin est
 * repoussée à chaque renouvellement — pas un grant par facture. La résiliation
 * ne demande donc aucun traitement : la date déjà posée fait le travail.
 */
export async function upsertSubscriptionGrant(input: SubscriptionGrantInput) {
  const { userId, offer, subscriptionId, periodEnd, pastDue = false } = input;

  const { error } = await getSupabaseAdmin()
    .from("access_grants")
    .upsert(
      {
        user_id: userId,
        source: "stripe_subscription" satisfies AccessSource,
        offer_id: offer?.id ?? null,
        stripe_subscription_id: subscriptionId,
        ends_at: periodEnd?.toISOString() ?? null,
        payment_state: pastDue ? "past_due" : "ok",
        revoked_at: null,
      },
      { onConflict: "stripe_subscription_id" }
    );

  // Une écriture perdue doit faire échouer le webhook : Stripe rejouera
  // l'événement. Sans cela l'utilisateur paie sans que son accès s'ouvre.
  if (error) {
    throw new Error(`grant d'abonnement non écrit (${subscriptionId}) : ${error.message}`);
  }
}

/**
 * Échec de paiement : décision client — on ne coupe pas, Stripe relance
 * pendant trois semaines et l'utilisateur est prévenu par un bandeau. L'accès
 * est prolongé jusqu'à la fin de cette fenêtre s'il expirait avant.
 */
export async function markSubscriptionPastDue(subscriptionId: string) {
  const supabase = getSupabaseAdmin();

  const { data: grant } = await supabase
    .from("access_grants")
    .select("id, ends_at")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!grant) return;

  const graceUntil = new Date(Date.now() + DUNNING_GRACE_DAYS * 86_400_000);
  const current = grant.ends_at ? new Date(grant.ends_at) : null;

  const { error } = await supabase
    .from("access_grants")
    .update({
      payment_state: "past_due",
      ends_at: current && current > graceUntil ? current.toISOString() : graceUntil.toISOString(),
    })
    .eq("id", grant.id);

  if (error) throw new Error(`impayé non enregistré (${subscriptionId}) : ${error.message}`);
}

/**
 * Fin de l'abonnement côté Stripe. Le grant n'est jamais supprimé —
 * l'historique commercial doit rester lisible — et surtout il n'est jamais
 * raccourci sans raison.
 *
 * Le cahier des charges est explicite : « l'utilisateur conserve son accès
 * jusqu'à la fin de la période déjà payée ». Une résiliation classique arrive
 * ici alors que la période court encore : on ne touche donc pas à la date de
 * fin, elle fera le travail toute seule. Seule la fin des relances d'impayé
 * justifie une coupure immédiate — l'utilisateur n'a alors rien payé pour la
 * période en cours, et il a été prévenu pendant trois semaines.
 */
export async function closeSubscriptionGrant(subscriptionId: string) {
  const supabase = getSupabaseAdmin();

  const { data: grant } = await supabase
    .from("access_grants")
    .select("id, ends_at, payment_state")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!grant) return;

  if (grant.payment_state !== "past_due") {
    // Résiliation en règle : la date de fin de période payée fait foi.
    return;
  }

  const now = new Date().toISOString();
  const stillOpen = !grant.ends_at || new Date(grant.ends_at) > new Date();
  if (!stillOpen) return;

  const { error } = await supabase
    .from("access_grants")
    .update({ ends_at: now, payment_state: "ok" })
    .eq("id", grant.id);

  if (error) throw new Error(`clôture d'abonnement échouée (${subscriptionId}) : ${error.message}`);
}

interface PaymentGrantInput {
  userId: string;
  offer: Offer;
  paymentIntentId: string | null;
  checkoutSessionId: string;
}

/**
 * Paiement unique : la durée d'accès vient de l'offre, pas du montant payé.
 * 397 € peut valoir un Lifetime comme douze mois — ce sont deux paramètres
 * distincts (cahier des charges).
 */
export async function createPaymentGrant(input: PaymentGrantInput) {
  const { userId, offer, paymentIntentId, checkoutSessionId } = input;

  const endsAt =
    offer.access_kind === "lifetime"
      ? null
      : addAccessDuration(new Date(), offer.access_duration);

  if (offer.access_kind === "duration" && !endsAt) {
    throw new Error(`Offre ${offer.id} : durée d'accès illisible (${offer.access_duration})`);
  }

  const { error } = await getSupabaseAdmin()
    .from("access_grants")
    .upsert(
      {
        user_id: userId,
        source: "stripe_payment" satisfies AccessSource,
        offer_id: offer.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_checkout_session_id: checkoutSessionId,
        ends_at: endsAt?.toISOString() ?? null,
      },
      { onConflict: "stripe_payment_intent_id" }
    );

  if (error) {
    throw new Error(`grant de paiement non écrit (${checkoutSessionId}) : ${error.message}`);
  }
}
