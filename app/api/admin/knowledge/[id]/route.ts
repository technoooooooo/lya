import { requireAdmin } from "@/lib/auth/requireAdmin";
import { reindexDocumentContent } from "@/lib/ai/indexing";
import { updateKnowledgeDocumentSchema } from "@/lib/validations/admin";
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
    const parsed = updateKnowledgeDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.content !== undefined) updates.content = parsed.data.content;
    if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;
    updates.updated_at = new Date().toISOString();

    // Ré-indexation RAG AVANT la mise à jour du document : l'échec le plus
    // probable (API embeddings) laisse alors le document ET son index intacts,
    // au lieu d'un document mis à jour avec des chunks obsolètes.
    if (parsed.data.content !== undefined) {
      try {
        await reindexDocumentContent(supabase, id, parsed.data.content);
      } catch {
        return NextResponse.json(
          { success: false, error: { message: "Erreur de vectorisation du contenu — document non modifié", code: "EMBEDDING_ERROR" } },
          { status: 500 }
        );
      }
    }

    const { data, error } = await supabase
      .from("knowledge_documents")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur mise à jour document", code: "DB_ERROR" } },
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

    // Clean up files from storage before deleting document
    const { data: files } = await supabase
      .from("knowledge_files")
      .select("storage_path")
      .eq("document_id", id);

    if (files && files.length > 0) {
      await supabase.storage
        .from("knowledge-files")
        .remove(files.map((f) => f.storage_path));
    }

    const { error } = await supabase
      .from("knowledge_documents")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur suppression document", code: "DB_ERROR" } },
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
