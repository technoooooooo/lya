import { requireAdmin } from "@/lib/auth/requireAdmin";
import { validateFile } from "@/lib/validations/admin";
import { extractPdfText, indexFileChunks } from "@/lib/ai/indexing";
import { NextRequest, NextResponse, after } from "next/server";
import { randomUUID } from "crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, response } = await requireAdmin();
    if (response) return response;

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
    const { supabase, response } = await requireAdmin();
    if (response) return response;

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
    // Fichiers PDF dont l'extraction + la vectorisation sont différées après la
    // réponse HTTP (voir after() plus bas). On garde le buffer en mémoire.
    const pdfJobs: {
      fileId: string;
      buffer: Buffer;
      fileName: string;
    }[] = [];

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

      const isPdf = file.type === "application/pdf";

      // Insert DB record. L'extraction PDF et la vectorisation sont différées
      // (statut 'pending') ; une image n'a rien à indexer → 'done' d'emblée.
      const { data: fileRecord, error: dbError } = await supabase
        .from("knowledge_files")
        .insert({
          document_id: id,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          extracted_text: null,
          indexing_status: isPdf ? "pending" : "done",
          chunk_count: 0,
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

      if (isPdf) {
        pdfJobs.push({ fileId: fileRecord.id, buffer, fileName: file.name });
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

    // Extraction PDF + vectorisation RAG en tâche de fond : la réponse part
    // immédiatement, ce qui évite tout timeout sur un gros document (livre).
    // Le statut d'indexation est mis à jour au fil de l'eau ; le client le
    // rafraîchit par polling. En cas d'échec, le fichier est conservé et
    // marqué 'error' (pas de rollback) pour rester visible côté admin.
    if (pdfJobs.length > 0) {
      after(async () => {
        for (const job of pdfJobs) {
          try {
            await supabase
              .from("knowledge_files")
              .update({ indexing_status: "indexing" })
              .eq("id", job.fileId);

            const extractedText = await extractPdfText(job.buffer);

            if (!extractedText || extractedText.trim().length === 0) {
              // PDF sans texte extractible (scan sans OCR, PDF vide…).
              await supabase
                .from("knowledge_files")
                .update({ indexing_status: "no_text" })
                .eq("id", job.fileId);
              continue;
            }

            const chunkCount = await indexFileChunks(supabase, {
              documentId: id,
              fileId: job.fileId,
              text: extractedText,
            });

            await supabase
              .from("knowledge_files")
              .update({
                extracted_text: extractedText,
                indexing_status: chunkCount > 0 ? "done" : "no_text",
                chunk_count: chunkCount,
              })
              .eq("id", job.fileId);
          } catch (err) {
            await supabase
              .from("knowledge_files")
              .update({
                indexing_status: "error",
                indexing_error:
                  err instanceof Error
                    ? err.message.slice(0, 500)
                    : "Erreur inconnue",
              })
              .eq("id", job.fileId);
          }
        }
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
