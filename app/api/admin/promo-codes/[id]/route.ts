import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { deleteLyaPromotionCode, setPromotionCodeActive } from "@/lib/stripe/admin";
import { ok, fail, failFrom } from "@/lib/admin/http";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const { active } = (await request.json().catch(() => ({}))) as { active?: boolean };
  if (typeof active !== "boolean") return fail("Paramètre active manquant", "INVALID_INPUT", 400);

  try {
    return ok(await setPromotionCodeActive(id, active));
  } catch (error) {
    return failFrom(error, `code promo ${id}`);
  }
}

/** Désactive le code et le retire de la liste (Stripe n'autorise pas la suppression). */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  try {
    await deleteLyaPromotionCode(id);
    return ok({ deleted: true });
  } catch (error) {
    return failFrom(error, `suppression code promo ${id}`);
  }
}
