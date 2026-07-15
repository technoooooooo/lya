import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createGuardrailSchema } from "@/lib/validations/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { supabase, response } = await requireAdmin();
    if (response) return response;

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
    const { supabase, response } = await requireAdmin();
    if (response) return response;

    const body = await request.json();
    const parsed = createGuardrailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }
    const { type, subject, description } = parsed.data;

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
