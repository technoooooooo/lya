import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { stripeApi } from "@/lib/stripe";
import { isOfferOnSale, checkEligibility } from "@/lib/billing/offers";
import type { Offer } from "@/types/database";

interface StripeCustomer {
  id: string;
}

function error(message: string, code: string, status: number) {
  return NextResponse.json({ success: false, error: { message, code } }, { status });
}

/**
 * Ouvre une session Stripe Checkout pour une offre Lya.
 *
 * Le compte est toujours créé avant le paiement (décision client) : on dispose
 * donc de l'utilisateur au moment du Checkout et on le rattache de façon
 * certaine, par client_reference_id et par les metadata de l'abonnement. Aucun
 * rattrapage par email n'est nécessaire dans ce parcours.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return error("Non authentifié", "UNAUTHORIZED", 401);
    }

    const body = await request.json().catch(() => ({}));
    const { offerId, slug } = body as { offerId?: string; slug?: string };

    if (!offerId && !slug) {
      return error("Offre non précisée", "MISSING_OFFER", 400);
    }

    const { data: offerRow } = await supabase
      .from("offers")
      .select("*")
      .eq(offerId ? "id" : "slug", offerId ?? slug)
      .maybeSingle();

    const offer = offerRow as Offer | null;

    if (!offer) return error("Offre introuvable", "OFFER_NOT_FOUND", 404);

    if (!isOfferOnSale(offer)) {
      return error("Cette offre n'est plus disponible", "OFFER_UNAVAILABLE", 409);
    }

    const eligibility = await checkEligibility(supabase, user.id, offer);
    if (!eligibility.allowed) {
      return error(eligibility.reason, "NOT_ELIGIBLE", 403);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, first_name, last_name")
      .eq("user_id", user.id)
      .single();

    // Le client Stripe porte l'user_id : c'est ce qui permet au webhook de
    // rattacher un renouvellement des mois plus tard.
    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripeApi.post<StripeCustomer>("/customers", {
        email: user.email,
        name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const base = siteUrl();
    const isSubscription = offer.mode === "subscription";

    const session = await stripeApi.post<{ id: string; url: string }>(
      "/checkout/sessions",
      {
        mode: offer.mode,
        customer: customerId,
        client_reference_id: user.id,
        line_items: [{ price: offer.stripe_price_id, quantity: 1 }],
        // Les codes promo restent créés et pilotés dans Stripe.
        allow_promotion_codes: true,
        success_url: `${base}/abonnement/merci?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/abonnement`,
        metadata: { user_id: user.id, offer_id: offer.id },
        ...(isSubscription
          ? {
              subscription_data: {
                metadata: { user_id: user.id, offer_id: offer.id },
                ...(offer.trial_days ? { trial_period_days: offer.trial_days } : {}),
              },
            }
          : {
              payment_intent_data: {
                metadata: { user_id: user.id, offer_id: offer.id },
              },
            }),
      },
      // Rejouer la requête (double-clic, retry réseau) ne crée pas deux sessions.
      { idempotencyKey: `checkout:${user.id}:${offer.id}:${offer.stripe_price_id}` }
    );

    return NextResponse.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error("[STRIPE] création de session Checkout impossible", err);
    return error("Erreur serveur", "SERVER_ERROR", 500);
  }
}
