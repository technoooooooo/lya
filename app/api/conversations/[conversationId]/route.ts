import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: "Non authentifié", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("id, title, pillar_id, created_at, updated_at, pillars(name)")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (convError || !conv) {
      return NextResponse.json(
        { success: false, error: { message: "Conversation introuvable", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    const { data: messages, error: msgsError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgsError) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur chargement messages", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    const pillar = (conv as Record<string, unknown>).pillars as { name: string } | null;

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          id: conv.id,
          title: conv.title,
          pillar_id: conv.pillar_id,
          pillar_name: pillar?.name ?? null,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
        },
        messages: messages || [],
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: "Non authentifié", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    // Delete messages first (foreign key constraint)
    await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur suppression", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
