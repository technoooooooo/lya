import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: "Non authentifié", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { message: "Accès interdit", code: "FORBIDDEN" } },
        { status: 403 }
      );
    }

    const { userId } = await params;

    // Fetch conversations with pillar info
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, pillar_id, pillars(name), created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (convError) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur chargement conversations", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    // Fetch message count per conversation
    const convIds = (conversations || []).map((c) => c.id);
    let totalMessages = 0;

    if (convIds.length > 0) {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds);

      totalMessages = count || 0;
    }

    // Build pillar breakdown
    const pillarCounts: Record<string, { name: string; count: number }> = {};
    let globalCount = 0;

    for (const conv of conversations || []) {
      if (conv.pillar_id) {
        const pillar = (conv as Record<string, unknown>).pillars as { name: string } | null;
        const name = pillar?.name || "Inconnu";
        if (!pillarCounts[conv.pillar_id]) {
          pillarCounts[conv.pillar_id] = { name, count: 0 };
        }
        pillarCounts[conv.pillar_id].count++;
      } else {
        globalCount++;
      }
    }

    const totalConversations = (conversations || []).length;

    const breakdown = [
      ...Object.entries(pillarCounts).map(([id, { name, count }]) => ({
        pillarId: id,
        pillarName: name,
        count,
        percentage: totalConversations > 0 ? Math.round((count / totalConversations) * 100) : 0,
      })),
      ...(globalCount > 0
        ? [{
            pillarId: null as string | null,
            pillarName: "Global",
            count: globalCount,
            percentage: totalConversations > 0 ? Math.round((globalCount / totalConversations) * 100) : 0,
          }]
        : []),
    ].sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        totalConversations,
        totalMessages,
        breakdown,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
