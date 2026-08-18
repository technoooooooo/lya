import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { extractPdfText } from "@/lib/ai/indexing";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { SUPABASE_URL, serverEnv } from "@/lib/env";
import {
  detectFormat,
  FORMAT_META,
  withFormatExtension,
} from "@/lib/chat/fileFormat";

// Upload des pièces jointes du chat (photos, PDF) vers le bucket public
// `chat-attachments`. Le fichier est référencé ensuite en markdown dans le
// contenu du message (voir lib/chat/attachments.ts). Pour les PDF, le texte
// est extrait ici et stocké en sidecar `<fichier>.txt` — la route chat le
// récupère pour l'injecter dans le contexte du modèle.
//
// Le format est déterminé à partir du contenu réel du fichier, pas de son
// extension ni du type MIME annoncé par le navigateur : une carte de parcours
// exportée en PDF puis renommée en « .jpg » arrivait sinon dans le bucket
// étiquetée image/jpeg, et le modèle refusait de la lire.

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

    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Fichier trop volumineux (max ${Math.round(MAX_PDF_SIZE / 1024 / 1024)} Mo)`,
            code: "FILE_TOO_LARGE",
          },
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectFormat(buffer);

    if (detected === "heic") {
      return NextResponse.json(
        {
          success: false,
          error: {
            message:
              "Les photos au format HEIC (iPhone) ne sont pas prises en charge. Dans Réglages > Appareil photo > Formats, choisissez « Le plus compatible », ou partagez la photo en JPEG.",
            code: "UNSUPPORTED_TYPE",
          },
        },
        { status: 400 }
      );
    }

    if (!detected) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message:
              "Format non pris en charge. Formats acceptés : photo (JPG, PNG, WebP, GIF) ou document PDF.",
            code: "UNSUPPORTED_TYPE",
          },
        },
        { status: 400 }
      );
    }

    const format = FORMAT_META[detected];
    const isImage = format.kind === "image";
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Photo trop volumineuse (max ${Math.round(MAX_IMAGE_SIZE / 1024 / 1024)} Mo)`,
            code: "FILE_TOO_LARGE",
          },
        },
        { status: 400 }
      );
    }

    // Client service-role : le bucket n'a pas de policy d'écriture publique,
    // toute écriture passe par cette route authentifiée.
    const admin = createAdminClient(
      SUPABASE_URL,
      serverEnv("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const path = `${user.id}/${randomUUID()}.${format.ext}`;

    const { error: uploadError } = await admin.storage
      .from("chat-attachments")
      .upload(path, buffer, { contentType: format.mime });
    if (uploadError) {
      console.error("Chat upload error:", uploadError.message);
      return NextResponse.json(
        { success: false, error: { message: "Échec de l'envoi du fichier", code: "UPLOAD_FAILED" } },
        { status: 500 }
      );
    }

    let pdfHasText = false;
    if (!isImage) {
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

    // Le nom affiché suit le format réellement détecté : un PDF renommé en
    // « .jpg » doit apparaître comme un document dans la conversation.
    const displayName = withFormatExtension(file.name, detected);

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        name: displayName,
        kind: format.kind,
        // PDF sans texte extractible (scan, carte de parcours photographiée) :
        // il est désormais transmis tel quel au modèle, qui en lit les pages.
        pdfHasText: isImage ? undefined : pdfHasText,
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
