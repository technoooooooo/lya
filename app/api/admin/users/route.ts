import { requireAdmin } from "@/lib/auth/requireAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { supabase, response } = await requireAdmin();
    if (response) return response;

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Erreur chargement utilisateurs",
            code: "DB_ERROR",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: profiles });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Erreur serveur", code: "SERVER_ERROR" },
      },
      { status: 500 }
    );
  }
}
