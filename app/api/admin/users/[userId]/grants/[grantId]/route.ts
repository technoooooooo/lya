import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ok, fail, failFrom } from "@/lib/admin/http";

/**
 * Révocation (ou rétablissement) d'un accès. Un grant n'est jamais supprimé :
 * l'historique reste lisible. Les accès issus de Stripe ne se révoquent pas
 * ici — Stripe continuerait de facturer : on passe par la résiliation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; grantId: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { userId, grantId } = await params;
  const { action } = (await request.json().catch(() => ({}))) as { action?: string };
  if (action !== "revoke" && action !== "restore") return fail("Action inconnue", "INVALID_INPUT", 400);

  const admin = getSupabaseAdmin();
  const { data: grant } = await admin
    .from("access_grants")
    .select("id, source")
    .eq("id", grantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!grant) return fail("Accès introuvable", "NOT_FOUND", 404);
  if (grant.source.startsWith("stripe_")) {
    return fail(
      "Cet accès vient d'un paiement Stripe : résiliez l'abonnement ou remboursez la facture à la place.",
      "STRIPE_GRANT",
      400
    );
  }

  const { error } = await admin
    .from("access_grants")
    .update({ revoked_at: action === "revoke" ? new Date().toISOString() : null })
    .eq("id", grantId);

  if (error) return failFrom(error, "révocation d'accès");
  return ok({ updated: true });
}
