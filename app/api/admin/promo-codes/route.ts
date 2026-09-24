import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createLyaPromotionCode, listLyaPromotionCodes, dashboardUrl } from "@/lib/stripe/admin";
import { ok, fail, failFrom } from "@/lib/admin/http";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    return ok({ codes: await listLyaPromotionCodes(), dashboardUrl: dashboardUrl("coupons") });
  } catch (error) {
    return failFrom(error, "liste des codes promo");
  }
}

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/, "Code : 3 à 40 caractères, lettres, chiffres, - ou _"),
    name: z.string().trim().max(80).optional(),
    discountType: z.enum(["percent", "amount"]),
    percentOff: z.number().min(1).max(100).optional(),
    amountOffCents: z.number().int().min(1).optional(),
    duration: z.enum(["once", "repeating", "forever"]),
    durationInMonths: z.number().int().min(1).max(36).optional(),
    maxRedemptions: z.number().int().min(1).optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    firstTimeOnly: z.boolean().optional(),
  })
  .refine((v) => (v.discountType === "percent" ? v.percentOff : v.amountOffCents), {
    message: "Indiquez le montant de la réduction",
  })
  .refine((v) => v.duration !== "repeating" || v.durationInMonths, {
    message: "Indiquez le nombre de mois",
  });

/** Crée un code de réduction Stripe, valable uniquement sur les offres Lya. */
export async function POST(request: NextRequest) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Données invalides", "INVALID_INPUT", 400);
  }
  const input = parsed.data;
  if (input.expiresAt && new Date(input.expiresAt) <= new Date()) {
    return fail("La date d'expiration doit être dans le futur", "INVALID_INPUT", 400);
  }

  try {
    const code = await createLyaPromotionCode({
      code: input.code,
      name: input.name,
      percentOff: input.discountType === "percent" ? input.percentOff : undefined,
      amountOffCents: input.discountType === "amount" ? input.amountOffCents : undefined,
      duration: input.duration,
      durationInMonths: input.durationInMonths,
      maxRedemptions: input.maxRedemptions,
      expiresAt: input.expiresAt,
      firstTimeOnly: input.firstTimeOnly,
      createdBy: user.id,
    });
    return ok(code);
  } catch (error) {
    return failFrom(error, "création de code promo");
  }
}
