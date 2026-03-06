import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";
import { buildSystemPrompt, buildMessages } from "@/lib/ai/promptBuilder";
import { sanitizeInput } from "@/lib/ai/guardrails";
import { sendMessageSchema } from "@/lib/validations/chat";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: "Non authentifié", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    // Check subscription status
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("subscription_status, is_active, first_name")
      .eq("user_id", user.id)
      .single();

    const isDev = process.env.NODE_ENV === "development";

    if (!isDev && !userProfile?.is_active) {
      return NextResponse.json(
        { success: false, error: { message: "Votre compte est désactivé", code: "ACCOUNT_DISABLED" } },
        { status: 403 }
      );
    }

    if (!isDev && userProfile?.subscription_status !== "active") {
      return NextResponse.json(
        { success: false, error: { message: "Abonnement requis pour utiliser le chat", code: "SUBSCRIPTION_REQUIRED" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const { conversationId, message, pillarId } = parsed.data;

    // Sanitize input
    const { sanitized, flagged } = sanitizeInput(message);
    if (flagged) {
      return NextResponse.json(
        { success: false, error: { message: "Votre message contient des instructions non autorisées.", code: "INJECTION_DETECTED" } },
        { status: 400 }
      );
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          pillar_id: pillarId || null,
          title: sanitized.slice(0, 50) + (sanitized.length > 50 ? "..." : ""),
        })
        .select("id")
        .single();

      if (convError || !newConv) {
        return NextResponse.json(
          { success: false, error: { message: "Erreur création conversation", code: "DB_ERROR" } },
          { status: 500 }
        );
      }
      convId = newConv.id;
    }

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "user",
      content: sanitized,
    });

    // Get conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(50);

    // Build system prompt with pillar context if applicable
    let pillarPrePrompt: string | undefined;
    if (pillarId) {
      const { data: pillar } = await supabase
        .from("pillars")
        .select("pre_prompt")
        .eq("id", pillarId)
        .single();
      pillarPrePrompt = pillar?.pre_prompt;
    } else if (conversationId) {
      // Check if existing conversation has a pillar
      const { data: conv } = await supabase
        .from("conversations")
        .select("pillar_id")
        .eq("id", conversationId)
        .single();
      if (conv?.pillar_id) {
        const { data: pillar } = await supabase
          .from("pillars")
          .select("pre_prompt")
          .eq("id", conv.pillar_id)
          .single();
        pillarPrePrompt = pillar?.pre_prompt;
      }
    }

    const systemPrompt = await buildSystemPrompt(pillarPrePrompt, userProfile?.first_name ?? undefined);
    const messages = buildMessages(
      systemPrompt,
      (history || []).slice(0, -1), // exclude the message we just inserted (it's already in the user message param)
      sanitized
    );

    // Stream response
    const provider = getAIProvider();
    const stream = await provider.stream(messages);

    // Collect full response for saving
    const [streamForClient, streamForSave] = stream.tee();

    // Save assistant response in background
    const saveResponse = async () => {
      const reader = streamForSave.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
      }

      await supabase.from("messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: fullResponse,
      });
    };

    // Don't await — let it run in background
    saveResponse().catch(console.error);

    // Return streaming response with conversation ID in header
    return new Response(streamForClient, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": convId!,
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Erreur serveur", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
