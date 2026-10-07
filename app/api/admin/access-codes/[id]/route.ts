import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ok, fail, failFrom } from "@/lib/admin/http";

type Params = { params: Promise<{ id: string }> };

const schema = z
  .object({
    is_active: z.boolean(),
    label: z.string().trim().max(120).nullable(),
    max_uses: z.number().int().min(1).nullable(),
    expires_at: z.string().datetime({ offset: true }).nullable(),
    access_days: z.number().int().min(1).max(3650).nullable(),
  })
  .partial();

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return fail("Aucun champ valide", "INVALID_INPUT", 400);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("promo_codes")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return failFrom(error, `code d'accès ${id}`);
  return ok(data);
}

/**
 * Suppression définitive. Les accès déjà ouverts par le code sont conservés
 * (access_grants.promo_code_id passe à null via la FK « on delete set null »).
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin().from("promo_codes").delete().eq("id", id).select("id");
  if (error) return failFrom(error, `suppression code d'accès ${id}`);
  if (!data?.length) return fail("Code introuvable", "NOT_FOUND", 404);
  return ok({ deleted: true });
}
