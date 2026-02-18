import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
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

    const { userId } = await params;
    const body = await request.json();

    const allowedFields = [
      "is_active",
      "subscription_status",
      "subscription_type",
      "role",
    ];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Aucun champ valide a mettre a jour",
            code: "INVALID_INPUT",
          },
        },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Erreur mise a jour utilisateur",
            code: "DB_ERROR",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { updated: true } });
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
