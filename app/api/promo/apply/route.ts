import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code, userId } = await request.json();

    if (!code || !userId) {
      return NextResponse.json(
        { success: false, error: { message: "Code et userId requis", code: "MISSING_PARAMS" } },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch and validate the promo code
    const { data: promo, error: promoError } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (promoError || !promo) {
      return NextResponse.json(
        { success: false, error: { message: "Code promo invalide", code: "INVALID_CODE" } },
        { status: 400 }
      );
    }

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: { message: "Code promo expiré", code: "EXPIRED_CODE" } },
        { status: 400 }
      );
    }

    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return NextResponse.json(
        { success: false, error: { message: "Code promo épuisé", code: "EXHAUSTED_CODE" } },
        { status: 400 }
      );
    }

    // Activate subscription for user
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        subscription_status: "active",
        subscription_type: "promo",
      })
      .eq("user_id", userId);

    if (profileError) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur mise à jour profil", code: "PROFILE_ERROR" } },
        { status: 500 }
      );
    }

    // Increment usage counter
    await supabase
      .from("promo_codes")
      .update({ current_uses: promo.current_uses + 1 })
      .eq("id", promo.id);

    return NextResponse.json({ success: true, data: { activated: true } });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
