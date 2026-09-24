import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/users";
import { customerBilling, isLiveMode, type CustomerBilling } from "@/lib/stripe/admin";
import { ok, fail, failFrom } from "@/lib/admin/http";

type Params = { params: Promise<{ userId: string }> };

/** Fiche complète : profil, droits d'accès (historique) et facturation Stripe. */
export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { userId } = await params;

  try {
    const found = await getAdminUser(userId);
    if (!found) return fail("Utilisateur introuvable", "NOT_FOUND", 404);

    const { data: grants } = await getSupabaseAdmin()
      .from("access_grants")
      .select("*, offers(display_name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Stripe injoignable ne doit pas empêcher d'ouvrir la fiche.
    let billing: CustomerBilling = { customer: null, subscriptions: [], invoices: [] };
    let billingError: string | null = null;
    try {
      billing = await customerBilling(found.profile.stripe_customer_id);
    } catch (error) {
      billingError = error instanceof Error ? error.message : "Stripe injoignable";
    }

    return ok({
      user: found.row,
      grants: (grants ?? []).map(({ offers, ...grant }) => ({
        ...grant,
        offer_name: (offers as { display_name: string } | null)?.display_name ?? null,
      })),
      billing,
      billingError,
      livemode: isLiveMode(),
    });
  } catch (error) {
    return failFrom(error, "fiche utilisateur");
  }
}

const patchSchema = z
  .object({
    is_active: z.boolean(),
    role: z.enum(["user", "admin"]),
    first_name: z.string().trim().max(80).nullable(),
    last_name: z.string().trim().max(80).nullable(),
    golf_club: z.string().trim().max(120).nullable(),
  })
  .partial();

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { userId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return fail("Aucun champ valide à mettre à jour", "INVALID_INPUT", 400);
  }

  // Garde-fou : un admin ne peut pas se couper lui-même l'accès au back-office.
  if (userId === user.id && (parsed.data.is_active === false || parsed.data.role === "user")) {
    return fail("Vous ne pouvez pas désactiver ou rétrograder votre propre compte.", "SELF_LOCKOUT", 400);
  }

  const { error } = await getSupabaseAdmin()
    .from("profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) return failFrom(error, "mise à jour utilisateur");
  return ok({ updated: true });
}
