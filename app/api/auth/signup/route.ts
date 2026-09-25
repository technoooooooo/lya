import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { signupSchema } from "@/lib/validations/auth";
import { findUsableLyaPromotionCode } from "@/lib/stripe/admin";

function error(message: string, code: string, status: number) {
  return NextResponse.json({ success: false, error: { message, code } }, { status });
}

type PromoCode = {
  id: string;
  code: string;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  access_days: number | null;
};

/**
 * Création de compte, étape 2 du parcours d'inscription.
 *
 * Le compte est créé côté serveur, déjà confirmé : le navigateur se connecte
 * aussitôt et enchaîne sur le Checkout de l'offre choisie. L'ancien parcours
 * (signUp + email de confirmation) cassait à trois endroits : lien PKCE ouvert
 * dans un autre navigateur que celui de l'inscription, code promo appliqué sans
 * session (refusé par le middleware et les RLS), et aucun passage par le choix
 * d'une offre. L'email est de toute façon vérifié par l'usage : Stripe y envoie
 * les reçus, et le mot de passe oublié reste la seule porte de récupération.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? "Données invalides", "VALIDATION_ERROR", 400);
  }

  const { firstName, lastName, email, password, accessCode } = parsed.data;
  const admin = getSupabaseAdmin();

  try {
    // Le code est vérifié avant de créer quoi que ce soit : un code erroné ne
    // doit pas laisser derrière lui un compte sans accès.
    let promo: PromoCode | null = null;
    // Code de réduction Stripe saisi à la place d'un code d'accès : le compte
    // est créé normalement et le Checkout s'ouvre avec la remise appliquée.
    let promotionCode: string | null = null;
    if (accessCode) {
      const verdict = await findUsablePromo(admin, accessCode);
      if (verdict.ok) {
        promo = verdict.promo;
      } else if (verdict.code === "INVALID_CODE") {
        promotionCode = await findStripeDiscountCode(accessCode);
        if (!promotionCode) return error(verdict.message, verdict.code, 400);
      } else {
        return error(verdict.message, verdict.code, 400);
      }
    }

    const metadata = { first_name: firstName, last_name: lastName };
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    let userId = created?.user?.id ?? null;

    if (createError) {
      if (createError.code === "weak_password") {
        return error(
          "Mot de passe trop faible : choisissez-en un plus long ou moins courant.",
          "WEAK_PASSWORD",
          400
        );
      }
      if (createError.code !== "email_exists" && createError.status !== 422) throw createError;

      // Comptes créés par l'ancien parcours et restés bloqués faute de
      // confirmation : jamais connectés, donc sans données. On les reprend
      // plutôt que de renvoyer la personne vers une connexion impossible.
      userId = await reclaimUnconfirmedAccount(admin, email, password, metadata);
      if (!userId) {
        return error(
          "Un compte existe déjà avec cet email. Connectez-vous, ou réinitialisez votre mot de passe.",
          "EMAIL_TAKEN",
          409
        );
      }
    }

    if (!userId) throw new Error("Création du compte sans identifiant");

    let accessGranted = false;
    if (promo) {
      accessGranted = await redeemPromo(admin, promo, userId);
    }

    return NextResponse.json({ success: true, data: { accessGranted, promotionCode } });
  } catch (err) {
    console.error("[SIGNUP] création de compte impossible", err);
    return error("Impossible de créer le compte pour le moment. Réessayez dans un instant.", "SERVER_ERROR", 500);
  }
}

async function findUsablePromo(
  admin: SupabaseClient,
  rawCode: string
): Promise<{ ok: true; promo: PromoCode } | { ok: false; message: string; code: string }> {
  const { data } = await admin
    .from("promo_codes")
    .select("*")
    .eq("code", rawCode.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  const promo = data as PromoCode | null;
  if (!promo) {
    return {
      ok: false,
      code: "INVALID_CODE",
      message: "Code inconnu, expiré ou déjà utilisé. Vérifiez la saisie auprès de votre coach.",
    };
  }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { ok: false, code: "EXPIRED_CODE", message: "Ce code d'accès a expiré." };
  }
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return { ok: false, code: "EXHAUSTED_CODE", message: "Ce code d'accès a déjà été utilisé le nombre maximum de fois." };
  }
  return { ok: true, promo };
}

async function findStripeDiscountCode(rawCode: string): Promise<string | null> {
  try {
    return (await findUsableLyaPromotionCode(rawCode))?.code ?? null;
  } catch (err) {
    // Stripe indisponible : le code est traité comme inconnu plutôt que de
    // bloquer l'inscription.
    console.error("[SIGNUP] vérification du code de réduction impossible", err);
    return null;
  }
}

/**
 * Ouvre l'accès associé au code. Le compteur est incrémenté sous condition de
 * sa valeur lue (verrou optimiste) : deux inscriptions simultanées ne peuvent
 * pas dépasser max_uses.
 */
async function redeemPromo(admin: SupabaseClient, promo: PromoCode, userId: string): Promise<boolean> {
  const { data: claimed } = await admin
    .from("promo_codes")
    .update({ current_uses: promo.current_uses + 1 })
    .eq("id", promo.id)
    .eq("current_uses", promo.current_uses)
    .select("id");

  if (!claimed?.length) {
    console.warn("[SIGNUP] code d'accès consommé entre la vérification et l'usage", promo.code);
    return false;
  }

  const { error: grantError } = await admin.from("access_grants").insert({
    user_id: userId,
    source: "promo",
    promo_code_id: promo.id,
    // Sans durée sur le code : accès sans terme, comme les codes historiques.
    ends_at: promo.access_days ? new Date(Date.now() + promo.access_days * 86_400_000).toISOString() : null,
    note: `Code d'accès ${promo.code} saisi à l'inscription`,
  });

  if (grantError) {
    console.error("[SIGNUP] accès du code non ouvert", promo.code, grantError);
    return false;
  }
  return true;
}

async function reclaimUnconfirmedAccount(
  admin: SupabaseClient,
  email: string,
  password: string,
  metadata: Record<string, string>
): Promise<string | null> {
  const { data: existingId } = await admin.rpc("user_id_by_email", { p_email: email });
  if (!existingId) return null;

  const { data } = await admin.auth.admin.getUserById(existingId as string);
  const user = data?.user;
  if (!user || user.email_confirmed_at || user.last_sign_in_at) return null;

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (updateError) throw updateError;

  await admin
    .from("profiles")
    .update({ first_name: metadata.first_name, last_name: metadata.last_name })
    .eq("user_id", user.id);

  return user.id;
}
