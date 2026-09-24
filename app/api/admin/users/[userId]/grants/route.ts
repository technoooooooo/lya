import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ok, fail, failFrom } from "@/lib/admin/http";

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("days"), days: z.number().int().min(1).max(3650), note: z.string().max(300).optional() }),
  z.object({ kind: z.literal("until"), until: z.string().datetime({ offset: true }), note: z.string().max(300).optional() }),
  z.object({ kind: z.literal("lifetime"), note: z.string().max(300).optional() }),
]);

/**
 * Accès offert à la main (geste commercial, élève de stage, compensation).
 * Il se cumule avec un éventuel abonnement : l'accès effectif est le plus
 * lointain des grants, calculé par trigger.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { userId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Durée d'accès invalide", "INVALID_INPUT", 400);

  const input = parsed.data;
  const endsAt =
    input.kind === "lifetime"
      ? null
      : input.kind === "until"
        ? new Date(input.until)
        : new Date(Date.now() + input.days * 86_400_000);

  if (endsAt && endsAt <= new Date()) return fail("La date de fin doit être dans le futur", "INVALID_INPUT", 400);

  const { data, error } = await getSupabaseAdmin()
    .from("access_grants")
    .insert({
      user_id: userId,
      source: "manual",
      ends_at: endsAt?.toISOString() ?? null,
      note: input.note?.trim() || "Accès offert depuis l'admin",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return failFrom(error, "ajout d'accès");
  return ok(data);
}
