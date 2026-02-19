import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Non authentifié", code: "UNAUTHORIZED" },
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
          error: { message: "Accès interdit", code: "FORBIDDEN" },
        },
        { status: 403 }
      );
    }

    // Fetch file record to get storage path
    const { data: file, error: fetchError } = await supabase
      .from("knowledge_files")
      .select("storage_path")
      .eq("id", fileId)
      .eq("document_id", id)
      .single();

    if (fetchError || !file) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Fichier introuvable", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    // Delete from storage
    await supabase.storage
      .from("knowledge-files")
      .remove([file.storage_path]);

    // Delete DB record
    const { error: deleteError } = await supabase
      .from("knowledge_files")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Erreur suppression fichier",
            code: "DB_ERROR",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { id: fileId } });
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
