import { verifyStripeSignature } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPABASE_URL, serverEnv } from "@/lib/env";

// Supabase admin client (service role) — bypasses RLS for webhook-driven updates
function getSupabaseAdmin() {
  const url = SUPABASE_URL;
  const serviceRoleKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for admin client");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Stripe event type definitions (minimal, no stripe package dependency)
interface StripeCheckoutSession {
  id: string;
  customer: string;
  customer_email: string | null;
  client_reference_id: string | null;
  metadata: Record<string, string>;
  subscription: string | null;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  metadata: Record<string, string>;
}

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession | StripeSubscription;
  };
}

/**
 * Resolve user_id from a Stripe event object.
 * Priority: metadata.user_id > client_reference_id > customer_email lookup
 */
async function resolveUserId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  obj: StripeCheckoutSession | StripeSubscription
): Promise<string | null> {
  // 1. Check metadata.user_id
  if (obj.metadata?.user_id) {
    return obj.metadata.user_id;
  }

  // 2. Check client_reference_id (checkout sessions only)
  if ("client_reference_id" in obj && obj.client_reference_id) {
    return obj.client_reference_id;
  }

  // 3. Fallback: lookup by customer_email (checkout sessions only)
  if ("customer_email" in obj && obj.customer_email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", obj.customer_email)
      .single();

    return profile?.user_id ?? null;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const webhookSecret = serverEnv("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { success: false, error: { message: "Webhook non configure", code: "CONFIG_ERROR" } },
        { status: 500 }
      );
    }

    // Read raw body for signature verification
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("stripe-signature");

    if (!signatureHeader) {
      return NextResponse.json(
        { success: false, error: { message: "Signature Stripe manquante", code: "MISSING_SIGNATURE" } },
        { status: 400 }
      );
    }

    // Verify webhook signature
    if (!verifyStripeSignature(rawBody, signatureHeader, webhookSecret)) {
      return NextResponse.json(
        { success: false, error: { message: "Signature Stripe invalide", code: "INVALID_SIGNATURE" } },
        { status: 401 }
      );
    }

    // Parse event after signature is verified
    const event: StripeEvent = JSON.parse(rawBody);
    const supabase = getSupabaseAdmin();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as StripeCheckoutSession;
        const userId = await resolveUserId(supabase, session);

        if (!userId) {
          console.error("checkout.session.completed: could not resolve user_id", {
            eventId: event.id,
            customer: session.customer,
          });
          // Return 200 to avoid Stripe retries for unresolvable events
          return NextResponse.json({ success: true, data: { received: true, warning: "user_not_found" } });
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_type: "paid",
            stripe_customer_id: session.customer,
          })
          .eq("user_id", userId);

        if (error) {
          console.error("checkout.session.completed: DB update failed", error);
          return NextResponse.json(
            { success: false, error: { message: "Erreur mise a jour profil", code: "DB_ERROR" } },
            { status: 500 }
          );
        }

        console.log(`Subscription activated for user ${userId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as StripeSubscription;
        const userId = await resolveUserId(supabase, subscription);

        if (!userId) {
          // Try to find user by stripe_customer_id
          const customerId = subscription.customer;
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (!profile?.user_id) {
            console.error("customer.subscription.updated: could not resolve user_id", {
              eventId: event.id,
              customer: customerId,
            });
            return NextResponse.json({ success: true, data: { received: true, warning: "user_not_found" } });
          }

          // Map Stripe subscription status to our status
          const subscriptionStatus = mapStripeStatus(subscription.status);

          const { error } = await supabase
            .from("profiles")
            .update({ subscription_status: subscriptionStatus })
            .eq("user_id", profile.user_id);

          if (error) {
            console.error("customer.subscription.updated: DB update failed", error);
            return NextResponse.json(
              { success: false, error: { message: "Erreur mise a jour profil", code: "DB_ERROR" } },
              { status: 500 }
            );
          }

          console.log(`Subscription updated for user ${profile.user_id}: ${subscriptionStatus}`);
          break;
        }

        // userId resolved directly
        const subscriptionStatus = mapStripeStatus(subscription.status);

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: subscriptionStatus,
            stripe_customer_id: subscription.customer,
          })
          .eq("user_id", userId);

        if (error) {
          console.error("customer.subscription.updated: DB update failed", error);
          return NextResponse.json(
            { success: false, error: { message: "Erreur mise a jour profil", code: "DB_ERROR" } },
            { status: 500 }
          );
        }

        console.log(`Subscription updated for user ${userId}: ${subscriptionStatus}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as StripeSubscription;
        let userId = await resolveUserId(supabase, subscription);

        // Fallback: look up by stripe_customer_id
        if (!userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("stripe_customer_id", subscription.customer)
            .single();

          userId = profile?.user_id ?? null;
        }

        if (!userId) {
          console.error("customer.subscription.deleted: could not resolve user_id", {
            eventId: event.id,
            customer: subscription.customer,
          });
          return NextResponse.json({ success: true, data: { received: true, warning: "user_not_found" } });
        }

        const { error } = await supabase
          .from("profiles")
          .update({ subscription_status: "inactive" })
          .eq("user_id", userId);

        if (error) {
          console.error("customer.subscription.deleted: DB update failed", error);
          return NextResponse.json(
            { success: false, error: { message: "Erreur mise a jour profil", code: "DB_ERROR" } },
            { status: 500 }
          );
        }

        console.log(`Subscription deactivated for user ${userId}`);
        break;
      }

      default:
        // Acknowledge unhandled event types to prevent retries
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ success: true, data: { received: true } });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Erreur traitement webhook", code: "WEBHOOK_ERROR" } },
      { status: 500 }
    );
  }
}

/**
 * Map Stripe subscription status to our internal subscription_status.
 * Stripe statuses: active, past_due, canceled, unpaid, trialing, incomplete, incomplete_expired, paused
 */
function mapStripeStatus(stripeStatus: string): "active" | "inactive" | "past_due" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
    default:
      return "inactive";
  }
}
