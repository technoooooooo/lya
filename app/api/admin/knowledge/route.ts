import { requireAdmin } from "@/lib/auth/requireAdmin";
import { reindexDocumentContent } from "@/lib/ai/indexing";
import { createKnowledgeDocumentSchema } from "@/lib/validations/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { supabase, response } = await requireAdmin();
    if (response) return response;

    const { data, error } = await supabase
      .from("knowledge_documents")
      .select("*, knowledge_files(*)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur chargement documents", code: "DB_ERROR" } },
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
    const parsed = createKnowledgeDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }
    const { title, content } = parsed.data;

    const { data, error } = await supabase
      .from("knowledge_documents")
      .insert({ title, content, is_active: true })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur création document", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    // Vectorisation RAG du content. En cas d'échec embedding, rollback du doc
    // pour ne pas laisser un document non indexé.
    try {
      await reindexDocumentContent(supabase, data.id, content);
    } catch {
      await supabase.from("knowledge_documents").delete().eq("id", data.id);
      return NextResponse.json(
        { success: false, error: { message: "Erreur vectorisation du contenu", code: "EMBEDDING_ERROR" } },
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
