import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const updates: Record<string, unknown> = {};
    if (body.type !== undefined) {
      if (body.type !== "forbidden" && body.type !== "exception") {
        return NextResponse.json(
          { success: false, error: { message: "Type invalide (forbidden ou exception)", code: "VALIDATION_ERROR" } },
          { status: 400 }
        );
      }
      updates.type = body.type;
    }
    if (body.subject !== undefined) updates.subject = body.subject;
    if (body.description !== undefined) updates.description = body.description;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("guardrails")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur mise à jour garde-fou", code: "DB_ERROR" } },
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { error } = await supabase
      .from("guardrails")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur suppression garde-fou", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
