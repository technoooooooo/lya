import type { SupabaseClient } from "@supabase/supabase-js";
import { stripeApi, StripeApiError, type StripeCustomer } from "./api";

/**
 * Le client Stripe mémorisé sur le profil n'est valable que dans le mode
 * (test ou live) où il a été créé. Un profil touché en développement porte un
 * `cus_…` de test qui n'existe pas en live : Stripe répond « No such customer »
 * et le Checkout tombe en 500 pour l'utilisateur. On vérifie donc l'existence
 * du client sous la clé courante avant de s'en servir, et on repart d'un
 * client neuf s'il est introuvable ou supprimé.
 */
export async function findUsableCustomer(customerId: string | null): Promise<StripeCustomer | null> {
  if (!customerId) return null;

  try {
    const customer = await stripeApi.get<StripeCustomer & { deleted?: boolean }>(
      `/customers/${customerId}`
    );
    return customer.deleted ? null : customer;
  } catch (error) {
    if (error instanceof StripeApiError && error.status === 404) return null;
    throw error;
  }
}

interface EnsureCustomerInput {
  userId: string;
  email: string | undefined;
  name?: string;
  storedCustomerId: string | null;
}

/**
 * Renvoie un client Stripe utilisable pour l'utilisateur, en le créant si le
 * profil n'en a pas ou si celui mémorisé n'est pas joignable sous la clé
 * courante. Le profil est mis à jour dans ce dernier cas : le webhook
 * rattache un renouvellement par ce stripe_customer_id.
 */
export async function ensureStripeCustomer(
  supabase: SupabaseClient,
  input: EnsureCustomerInput
): Promise<string> {
  const existing = await findUsableCustomer(input.storedCustomerId);
  if (existing) return existing.id;

  if (input.storedCustomerId) {
    console.warn(
      `[STRIPE] client ${input.storedCustomerId} introuvable sous la clé courante ` +
        `(user ${input.userId}) : recréation`
    );
  }

  // Le client Stripe porte l'user_id : c'est ce qui permet au webhook de
  // rattacher un renouvellement des mois plus tard.
  const customer = await stripeApi.post<StripeCustomer>("/customers", {
    email: input.email,
    name: input.name || undefined,
    metadata: { user_id: input.userId },
  });

  const { error } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`stripe_customer_id non enregistré (user ${input.userId}) : ${error.message}`);
  }

  return customer.id;
}
