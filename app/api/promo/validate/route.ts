import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: { message: "Code requis", code: "MISSING_CODE" } },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: promo, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !promo) {
      return NextResponse.json(
        { success: false, error: { message: "Code promo invalide", code: "INVALID_CODE" } },
        { status: 400 }
      );
    }

    // Check expiration
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: { message: "Code promo expiré", code: "EXPIRED_CODE" } },
        { status: 400 }
      );
    }

    // Check max uses
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return NextResponse.json(
        { success: false, error: { message: "Code promo épuisé", code: "EXHAUSTED_CODE" } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: { valid: true } });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
