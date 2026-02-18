import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Non authentifie", code: "UNAUTHORIZED" },
        },
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
        {
          success: false,
          error: { message: "Acces interdit", code: "FORBIDDEN" },
        },
        { status: 403 }
      );
    }

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
