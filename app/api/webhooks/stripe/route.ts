import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  verifyStripeSignature,
  retrieveSubscription,
  checkoutSessionPriceId,
  retrieveCustomer,
  subscriptionPeriodEnd,
  subscriptionPriceId,
  invoiceSubscriptionId,
  type StripeCheckoutSession,
  type StripeSubscription,
  type StripeInvoice,
} from "@/lib/stripe";
import {
  findOfferByPriceId,
  resolveUserId,
  linkStripeCustomer,
  upsertSubscriptionGrant,
  markSubscriptionPastDue,
  closeSubscriptionGrant,
  createPaymentGrant,
} from "@/lib/billing/grants";

interface StripeEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

const LOG = "[STRIPE]";

/**
 * Toujours répondre 200 sur un événement qu'on choisit d'ignorer : un 4xx/5xx
 * déclenche des relances Stripe pendant trois jours pour rien.
 */
function acknowledged(reason: string, detail?: Record<string, unknown>) {
  console.log(`${LOG} ${reason}`, detail ?? "");
  return NextResponse.json({ success: true, data: { received: true, reason } });
}

export async function POST(request: Request) {
  const webhookSecret = serverEnv("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error(`${LOG} STRIPE_WEBHOOK_SECRET absent`);
    return NextResponse.json(
      { success: false, error: { message: "Webhook non configuré", code: "CONFIG_ERROR" } },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");

  if (!signatureHeader) {
    return NextResponse.json(
      { success: false, error: { message: "Signature Stripe manquante", code: "MISSING_SIGNATURE" } },
      { status: 400 }
    );
  }

  if (!verifyStripeSignature(rawBody, signatureHeader, webhookSecret)) {
    return NextResponse.json(
      { success: false, error: { message: "Signature Stripe invalide", code: "INVALID_SIGNATURE" } },
      { status: 401 }
    );
  }

  const event: StripeEvent = JSON.parse(rawBody);
  const supabase = getSupabaseAdmin();

  // Idempotence : la clé primaire refuse le second passage d'un même événement.
  const { error: duplicate } = await supabase
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (duplicate) {
    if (duplicate.code === "23505") {
      return acknowledged("événement déjà traité", { id: event.id, type: event.type });
    }
    console.error(`${LOG} journalisation impossible`, duplicate);
  }

  try {
    await handleEvent(event);

    await supabase
      .from("stripe_events")
      .update({ handled_at: new Date().toISOString() })
      .eq("id", event.id);

    return NextResponse.json({ success: true, data: { received: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${LOG} échec du traitement — ${event.type} (${event.id}) : ${message}`);

    // L'événement est retiré du journal pour que la relance Stripe puisse
    // rejouer le traitement — sans quoi l'idempotence figerait l'échec.
    await supabase.from("stripe_events").delete().eq("id", event.id);

    return NextResponse.json(
      { success: false, error: { message: "Erreur traitement webhook", code: "WEBHOOK_ERROR" } },
      { status: 500 }
    );
  }
}

async function handleEvent(event: StripeEvent) {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object as StripeCheckoutSession);

    case "customer.subscription.created":
    case "customer.subscription.updated":
      return handleSubscriptionChanged(event.data.object as StripeSubscription);

    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(event.data.object as StripeSubscription);

    case "invoice.paid":
      return handleInvoicePaid(event.data.object as StripeInvoice);

    case "invoice.payment_failed":
      return handleInvoiceFailed(event.data.object as StripeInvoice);

    default:
      console.log(`${LOG} type non traité : ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: StripeCheckoutSession) {
  if (session.payment_status !== "paid" && session.mode !== "subscription") {
    console.log(`${LOG} session non payée, ignorée`, { id: session.id });
    return;
  }

  const userId = await resolveUserId({
    clientReferenceId: session.client_reference_id,
    metadataUserId: session.metadata?.user_id,
    stripeCustomerId: session.customer,
    email: session.customer_details?.email,
  });

  if (!userId) {
    console.error(`${LOG} utilisateur introuvable`, {
      session: session.id,
      customer: session.customer,
    });
    return;
  }

  await linkStripeCustomer(userId, session.customer);

  // Un abonnement est entièrement piloté par customer.subscription.* : la
  // session ne sert qu'à rattacher le client Stripe au compte Lya.
  if (session.mode === "subscription") return;

  const priceId = await checkoutSessionPriceId(session.id);
  const offer = await findOfferByPriceId(priceId);

  if (!offer) {
    console.log(`${LOG} price hors catalogue Lya, ignoré`, { session: session.id, priceId });
    return;
  }

  await createPaymentGrant({
    userId,
    offer,
    paymentIntentId: session.payment_intent,
    checkoutSessionId: session.id,
  });

  console.log(`${LOG} accès accordé — user ${userId}, offre ${offer.internal_name}`);
}

async function handleSubscriptionChanged(subscription: StripeSubscription) {
  const offer = await findOfferByPriceId(subscriptionPriceId(subscription));

  if (!offer) {
    console.log(
      `${LOG} abonnement hors catalogue Lya, ignoré — ${subscription.id} / ${subscriptionPriceId(subscription)}`
    );
    return;
  }

  // L'ordre de livraison des événements n'est pas garanti :
  // customer.subscription.created peut précéder la session Checkout qui pose
  // le stripe_customer_id sur le profil. D'où le repli par l'email du client.
  let userId = await resolveUserId({
    metadataUserId: subscription.metadata?.user_id,
    stripeCustomerId: subscription.customer,
  });

  if (!userId && subscription.customer) {
    const customer = await retrieveCustomer(subscription.customer);
    userId = await resolveUserId({
      metadataUserId: customer.metadata?.user_id,
      email: customer.email,
    });
    if (userId) await linkStripeCustomer(userId, subscription.customer);
  }

  if (!userId) {
    console.error(`${LOG} utilisateur introuvable`, {
      subscription: subscription.id,
      customer: subscription.customer,
    });
    return;
  }

  // Un abonnement résilié en fin de période reste 'active' chez Stripe : la
  // date de fin déjà posée suffit, rien de particulier à traiter ici.
  const terminal = ["canceled", "incomplete_expired"].includes(subscription.status);
  if (terminal) {
    await closeSubscriptionGrant(subscription.id);
    return;
  }

  await upsertSubscriptionGrant({
    userId,
    offer,
    subscriptionId: subscription.id,
    periodEnd: subscriptionPeriodEnd(subscription),
    pastDue: ["past_due", "unpaid"].includes(subscription.status),
  });

  console.log(
    `${LOG} abonnement synchronisé — user ${userId}, statut ${subscription.status}, ` +
      `fin ${subscriptionPeriodEnd(subscription)?.toISOString() ?? "n/a"}`
  );
}

async function handleSubscriptionDeleted(subscription: StripeSubscription) {
  await closeSubscriptionGrant(subscription.id);
  console.log(`${LOG} abonnement clos`, { subscription: subscription.id });
}

async function handleInvoicePaid(invoice: StripeInvoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  // La facture ne porte pas la nouvelle période : on relit l'abonnement.
  const subscription = await retrieveSubscription(subscriptionId);
  await handleSubscriptionChanged(subscription);
}

async function handleInvoiceFailed(invoice: StripeInvoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const offer = await findOfferByPriceId(invoice.lines?.data?.[0]?.price?.id ?? null);
  if (!offer) {
    console.log(`${LOG} impayé hors catalogue Lya, ignoré`, { subscription: subscriptionId });
    return;
  }

  await markSubscriptionPastDue(subscriptionId);
  console.log(`${LOG} impayé : accès maintenu pendant les relances`, { subscription: subscriptionId });
}
