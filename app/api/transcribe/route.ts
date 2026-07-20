import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify auth
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

    // Parse the multipart form data
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Aucun fichier audio fourni",
            code: "MISSING_AUDIO",
          },
        },
        { status: 400 }
      );
    }

    // Check file size (max 25MB — Whisper API limit)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Le fichier audio est trop volumineux (max 25 Mo)",
            code: "FILE_TOO_LARGE",
          },
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not set");
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Configuration serveur manquante",
            code: "SERVER_CONFIG_ERROR",
          },
        },
        { status: 500 }
      );
    }

    // Build the FormData for the Whisper API. Le nom de fichier du client
    // porte l'extension du conteneur réel (webm, mp4 sur Safari/iOS…) —
    // Whisper s'appuie dessus pour décoder.
    const whisperFormData = new FormData();
    const fileName =
      audioFile instanceof File && audioFile.name ? audioFile.name : "audio.webm";
    whisperFormData.append("file", audioFile, fileName);
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", "fr");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: whisperFormData,
      }
    );

    if (!whisperResponse.ok) {
      const errorBody = await whisperResponse.text();
      console.error("Whisper API error:", whisperResponse.status, errorBody);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Erreur lors de la transcription audio",
            code: "TRANSCRIPTION_ERROR",
          },
        },
        { status: 502 }
      );
    }

    const whisperResult = await whisperResponse.json();

    return NextResponse.json({
      success: true,
      data: { text: whisperResult.text },
    });
  } catch (error) {
    console.error("Transcribe API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Erreur serveur", code: "SERVER_ERROR" },
      },
      { status: 500 }
    );
  }
}
