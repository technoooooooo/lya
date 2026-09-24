import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { applySubscriptionAction, type SubscriptionAction } from "@/lib/stripe/admin";
import { invalidatePaymentsCache } from "@/lib/admin/payments";
import { ok, fail, failFrom } from "@/lib/admin/http";

const ACTIONS: SubscriptionAction[] = ["cancel_at_period_end", "resume", "cancel_now"];

/**
 * Résilier à échéance, réactiver, ou résilier immédiatement un abonnement Lya.
 * L'accès suit via les webhooks Stripe (customer.subscription.*).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { subscriptionId } = await params;
  const { action } = (await request.json().catch(() => ({}))) as { action?: SubscriptionAction };
  if (!action || !ACTIONS.includes(action)) return fail("Action inconnue", "INVALID_INPUT", 400);

  try {
    await applySubscriptionAction(subscriptionId, action);
    invalidatePaymentsCache();
    return ok({ updated: true });
  } catch (error) {
    return failFrom(error, `abonnement ${subscriptionId} (${action})`);
  }
}
