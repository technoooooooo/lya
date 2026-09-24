import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ok, fail, failFrom } from "@/lib/admin/http";

/**
 * Codes d'accès gratuits (table promo_codes) : saisis à l'inscription, ils
 * ouvrent l'accès sans paiement — élèves de stage, partenaires. Distincts des
 * codes de réduction Stripe, qui s'appliquent au Checkout.
 */
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const admin = getSupabaseAdmin();
  const [{ data: codes, error }, { data: grants }] = await Promise.all([
    admin.from("promo_codes").select("*").order("created_at", { ascending: false }),
    admin
      .from("access_grants")
      .select("promo_code_id, user_id, created_at, ends_at, revoked_at")
      .not("promo_code_id", "is", null),
  ]);
  if (error) return failFrom(error, "liste des codes d'accès");

  const userIds = [...new Set((grants ?? []).map((g) => g.user_id))];
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("user_id, first_name, last_name").in("user_id", userIds)
    : { data: [] };
  const names = new Map(
    (profiles ?? []).map((p) => [p.user_id, [p.first_name, p.last_name].filter(Boolean).join(" ") || null])
  );

  return ok(
    (codes ?? []).map((code) => ({
      ...code,
      redemptions: (grants ?? [])
        .filter((g) => g.promo_code_id === code.id)
        .map((g) => ({ ...g, name: names.get(g.user_id) ?? null })),
    }))
  );
}

const schema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,40}$/, "Code : 3 à 40 caractères, lettres, chiffres, - ou _"),
  label: z.string().trim().max(120).optional(),
  accessDays: z.number().int().min(1).max(3650).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Données invalides", "INVALID_INPUT", 400);
  }
  const input = parsed.data;

  const { data, error } = await getSupabaseAdmin()
    .from("promo_codes")
    .insert({
      code: input.code,
      label: input.label || null,
      access_days: input.accessDays ?? null,
      max_uses: input.maxUses ?? null,
      expires_at: input.expiresAt ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error?.code === "23505") return fail("Ce code existe déjà", "DUPLICATE", 409);
  if (error) return failFrom(error, "création de code d'accès");
  return ok(data);
}
