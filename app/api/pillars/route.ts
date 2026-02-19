import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: "Non authentifié", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { data: pillars, error } = await supabase
      .from("pillars")
      .select("id, name, description, icon, pre_prompt, display_order, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Pillars DB error:", error);
      return NextResponse.json(
        { success: false, error: { message: "Erreur chargement des piliers", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: pillars });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
