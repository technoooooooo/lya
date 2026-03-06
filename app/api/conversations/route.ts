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

    const { data: rawConversations, error } = await supabase
      .from("conversations")
      .select("id, title, pillar_id, created_at, updated_at, pillars(name)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    const conversations = rawConversations?.map((conv) => {
      const pillar = (conv as Record<string, unknown>).pillars as { name: string } | null;
      return {
        id: conv.id,
        title: conv.title,
        pillar_id: conv.pillar_id,
        pillar_name: pillar?.name ?? null,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
      };
    }) ?? [];

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur chargement conversations", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: conversations });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
