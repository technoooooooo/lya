import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const { data, error } = await supabase
      .from("guardrails")
      .select("*")
      .order("type", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur chargement garde-fous", code: "DB_ERROR" } },
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

export async function POST(request: NextRequest) {
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
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { message: "Accès interdit", code: "FORBIDDEN" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, subject, description } = body;

    if (!type || !subject) {
      return NextResponse.json(
        { success: false, error: { message: "Type et sujet requis", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    if (type !== "forbidden" && type !== "exception") {
      return NextResponse.json(
        { success: false, error: { message: "Type invalide (forbidden ou exception)", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("guardrails")
      .insert({ type, subject, description: description || null, is_active: true })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur création garde-fou", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
