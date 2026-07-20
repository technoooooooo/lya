import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { extractPdfText } from "@/lib/ai/indexing";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// Upload des pièces jointes du chat (photos, PDF) vers le bucket public
// `chat-attachments`. Le fichier est référencé ensuite en markdown dans le
// contenu du message (voir lib/chat/attachments.ts). Pour les PDF, le texte
// est extrait ici et stocké en sidecar `<fichier>.txt` — la route chat le
// récupère pour l'injecter dans le contexte du modèle.

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 Mo
const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 Mo

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "Non authentifié", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { message: "Aucun fichier fourni", code: "MISSING_FILE" } },
        { status: 400 }
      );
    }

    const isImage = file.type in IMAGE_TYPES;
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Format non pris en charge. Formats acceptés : photo (JPG, PNG, WebP, GIF) ou document PDF.",
            code: "UNSUPPORTED_TYPE",
          },
        },
        { status: 400 }
      );
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_PDF_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Fichier trop volumineux (max ${Math.round(maxSize / 1024 / 1024)} Mo)`,
            code: "FILE_TOO_LARGE",
          },
        },
        { status: 400 }
      );
    }

    // Client service-role : le bucket n'a pas de policy d'écriture publique,
    // toute écriture passe par cette route authentifiée.
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const ext = isImage ? IMAGE_TYPES[file.type] : "pdf";
    const path = `${user.id}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("chat-attachments")
      .upload(path, buffer, { contentType: file.type });
    if (uploadError) {
      console.error("Chat upload error:", uploadError.message);
      return NextResponse.json(
        { success: false, error: { message: "Échec de l'envoi du fichier", code: "UPLOAD_FAILED" } },
        { status: 500 }
      );
    }

    let pdfHasText = false;
    if (isPdf) {
      const text = await extractPdfText(buffer);
      if (text && text.trim().length > 0) {
        pdfHasText = true;
        await admin.storage
          .from("chat-attachments")
          .upload(`${path}.txt`, Buffer.from(text.trim(), "utf-8"), {
            contentType: "text/plain",
          });
      }
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("chat-attachments").getPublicUrl(path);

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        name: file.name,
        kind: isImage ? "image" : "document",
        // PDF scanné (aucun texte extractible) : le fichier est joint mais
        // l'IA ne pourra pas en lire le contenu — le client peut prévenir.
        pdfHasText: isPdf ? pdfHasText : undefined,
      },
    });
  } catch (error) {
    console.error("Chat upload API error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
