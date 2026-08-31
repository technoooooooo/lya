import { stripeApi, type StripePrice } from "@/lib/stripe";
import type { Offer } from "@/types/database";

/**
 * Création et entretien du catalogue Lya dans Stripe.
 *
 * Le compte clickandgolf.fr héberge déjà 28 produits systeme.io (bootcamps,
 * stages, Académie TGA, paiements fractionnés) et leur historique de ventes.
 * Lya n'y touche jamais : elle crée ses propres produits, les marque, et
 * refuse d'écrire sur tout ce qui ne porte pas sa marque.
 */

/** Marque apposée sur chaque produit créé par Lya. */
export const LYA_MARKER_KEY = "managed_by";
export const LYA_MARKER_VALUE = "lya";

export class ForeignProductError extends Error {
  constructor(productId: string) {
    super(
      `Le produit ${productId} n'a pas été créé par Lya : modification refusée. ` +
        `Le catalogue systeme.io de clickandgolf.fr doit rester intact.`
    );
    this.name = "ForeignProductError";
  }
}

interface StripeProduct {
  id: string;
  name: string;
  active: boolean;
  metadata: Record<string, string>;
}

/**
 * Verrou d'écriture : toute modification d'un produit Stripe passe par ici.
 * Un produit sans la marque Lya fait lever une erreur — jamais une écriture
 * silencieuse sur le catalogue du client.
 */
export async function assertLyaManaged(productId: string): Promise<StripeProduct> {
  const product = await stripeApi.get<StripeProduct>(`/products/${productId}`);

  if (product.metadata?.[LYA_MARKER_KEY] !== LYA_MARKER_VALUE) {
    throw new ForeignProductError(productId);
  }

  return product;
}

function priceParams(offer: OfferDraft, productId: string): Record<string, unknown> {
  return {
    product: productId,
    unit_amount: offer.amount_cents,
    currency: offer.currency,
    ...(offer.mode === "subscription" && offer.recurring_interval
      ? {
          recurring: {
            interval: offer.recurring_interval,
            interval_count: offer.recurring_interval_count,
          },
        }
      : {}),
    metadata: {
      [LYA_MARKER_KEY]: LYA_MARKER_VALUE,
      // Redondance volontaire avec la table offers : le webhook reste capable
      // d'interpréter un paiement même si la ligne locale a été perdue.
      lya_access_kind: offer.access_kind,
      ...(offer.access_duration ? { lya_access_duration: offer.access_duration } : {}),
    },
  };
}

export type OfferDraft = Pick<
  Offer,
  | "internal_name"
  | "display_name"
  | "description"
  | "mode"
  | "recurring_interval"
  | "recurring_interval_count"
  | "amount_cents"
  | "currency"
  | "access_kind"
  | "access_duration"
>;

/** Crée le produit et le prix Stripe d'une nouvelle offre Lya. */
export async function createStripeOffer(
  offer: OfferDraft
): Promise<{ productId: string; priceId: string }> {
  const product = await stripeApi.post<StripeProduct>("/products", {
    name: offer.display_name,
    ...(offer.description ? { description: offer.description } : {}),
    metadata: {
      [LYA_MARKER_KEY]: LYA_MARKER_VALUE,
      lya_internal_name: offer.internal_name,
    },
  });

  const price = await stripeApi.post<StripePrice>("/prices", priceParams(offer, product.id));

  return { productId: product.id, priceId: price.id };
}

/**
 * Changement de tarif. Un Price Stripe est immuable : on en crée un nouveau et
 * on archive l'ancien. C'est précisément le comportement voulu par le client —
 * les abonnements en cours restent sur leur prix d'origine et ne basculent
 * qu'à leur renouvellement, à la manière de Netflix.
 */
export async function replaceStripePrice(
  offer: OfferDraft & { stripe_product_id: string; stripe_price_id: string | null }
): Promise<string> {
  await assertLyaManaged(offer.stripe_product_id);

  const price = await stripeApi.post<StripePrice>(
    "/prices",
    priceParams(offer, offer.stripe_product_id)
  );

  if (offer.stripe_price_id) {
    await stripeApi.post(`/prices/${offer.stripe_price_id}`, { active: false });
  }

  return price.id;
}

/** Met à jour le libellé du produit Stripe (jamais son prix). */
export async function updateStripeProduct(
  productId: string,
  fields: { name?: string; description?: string | null; active?: boolean }
) {
  await assertLyaManaged(productId);

  await stripeApi.post(`/products/${productId}`, {
    ...(fields.name ? { name: fields.name } : {}),
    ...(fields.description !== undefined ? { description: fields.description ?? "" } : {}),
    ...(fields.active !== undefined ? { active: fields.active } : {}),
  });
}

/**
 * Désactivation d'une offre : le produit et le prix sont archivés, jamais
 * supprimés — l'historique des ventes doit rester lisible dans Stripe.
 */
export async function archiveStripeOffer(offer: {
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}) {
  if (!offer.stripe_product_id) return;

  await assertLyaManaged(offer.stripe_product_id);

  if (offer.stripe_price_id) {
    await stripeApi.post(`/prices/${offer.stripe_price_id}`, { active: false });
  }
  await stripeApi.post(`/products/${offer.stripe_product_id}`, { active: false });
}
