import { createClient } from "@/lib/supabase/server";
import { validateFile } from "@/lib/validations/admin";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const MAX_EXTRACTED_TEXT_LENGTH = 50_000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: files, error } = await supabase
      .from("knowledge_files")
      .select("*")
      .eq("document_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Erreur chargement fichiers", code: "DB_ERROR" },
        },
        { status: 500 }
      );
    }

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
      (files ?? []).map(async (file) => {
        const { data: urlData } = await supabase.storage
          .from("knowledge-files")
          .createSignedUrl(file.storage_path, 3600);
        return { ...file, url: urlData?.signedUrl ?? null };
      })
    );

    return NextResponse.json({ success: true, data: filesWithUrls });
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify document exists
    const { data: doc, error: docError } = await supabase
      .from("knowledge_documents")
      .select("id")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Document introuvable", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Aucun fichier fourni",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const createdFiles = [];

    for (const file of files) {
      const validation = validateFile({ type: file.type, size: file.size });
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: `${file.name} : ${validation.error}`,
              code: "VALIDATION_ERROR",
            },
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const storagePath = `${id}/${randomUUID()}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("knowledge-files")
        .upload(storagePath, buffer, { contentType: file.type });

      if (uploadError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: `Erreur upload ${file.name} : ${uploadError.message}`,
              code: "STORAGE_ERROR",
            },
          },
          { status: 500 }
        );
      }

      // Extract text from PDF
      let extractedText: string | null = null;
      if (file.type === "application/pdf") {
        try {
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: new Uint8Array(buffer) });
          const result = await parser.getText();
          extractedText = result.text.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
          await parser.destroy();
        } catch {
          // PDF extraction failed — store file without extracted text
          extractedText = null;
        }
      }

      // Insert DB record
      const { data: fileRecord, error: dbError } = await supabase
        .from("knowledge_files")
        .insert({
          document_id: id,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          extracted_text: extractedText,
        })
        .select()
        .single();

      if (dbError) {
        // Try to clean up the uploaded file
        await supabase.storage.from("knowledge-files").remove([storagePath]);
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Erreur enregistrement fichier",
              code: "DB_ERROR",
            },
          },
          { status: 500 }
        );
      }

      // Generate signed URL for the response
      const { data: urlData } = await supabase.storage
        .from("knowledge-files")
        .createSignedUrl(storagePath, 3600);

      createdFiles.push({
        ...fileRecord,
        url: urlData?.signedUrl ?? null,
      });
    }

    return NextResponse.json(
      { success: true, data: createdFiles },
      { status: 201 }
    );
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
