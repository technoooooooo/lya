import { requireAdmin } from "@/lib/auth/requireAdmin";
import { updateGuardrailSchema } from "@/lib/validations/admin";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, response } = await requireAdmin();
    if (response) return response;

    const body = await request.json();
    const parsed = updateGuardrailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.type !== undefined) updates.type = parsed.data.type;
    if (parsed.data.subject !== undefined) updates.subject = parsed.data.subject;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;
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
    const { supabase, response } = await requireAdmin();
    if (response) return response;

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
