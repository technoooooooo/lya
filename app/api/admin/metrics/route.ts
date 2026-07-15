import { requireAdmin } from "@/lib/auth/requireAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { supabase, response } = await requireAdmin();
    if (response) return response;

    const [
      profilesResult,
      activeSubsResult,
      conversationsResult,
      messagesResult,
      usersTodayResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active"),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date().toISOString().split("T")[0]),
    ]);

    const metrics = {
      totalUsers: profilesResult.count ?? 0,
      activeSubscriptions: activeSubsResult.count ?? 0,
      totalConversations: conversationsResult.count ?? 0,
      totalMessages: messagesResult.count ?? 0,
      usersToday: usersTodayResult.count ?? 0,
    };

    return NextResponse.json({ success: true, data: metrics });
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
