import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { serverEnv, siteUrl } from "@/lib/env";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: "Non authentifié", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { success: false, error: { message: "Aucun abonnement Stripe trouvé", code: "NO_CUSTOMER" } },
        { status: 404 }
      );
    }

    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv("STRIPE_SECRET_KEY")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: profile.stripe_customer_id,
        return_url: `${siteUrl()}/account`,
      }),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error("Stripe portal error:", session);
      return NextResponse.json(
        { success: false, error: { message: "Erreur Stripe", code: "STRIPE_ERROR" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { url: session.url } });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
