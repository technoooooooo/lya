import { requireAdmin } from "@/lib/auth/requireAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { supabase, response } = await requireAdmin();
    if (response) return response;

    const { data, error } = await supabase
      .from("ai_config")
      .select("*")
      .order("key", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur chargement configuration", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, response } = await requireAdmin();
    if (response) return response;

    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof value !== "string") {
      return NextResponse.json(
        { success: false, error: { message: "Clé et valeur requises", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ai_config")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur mise à jour configuration", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
