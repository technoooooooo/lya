import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai/provider";
import { buildSystemPrompt, buildMessages, buildUserMessage } from "@/lib/ai/promptBuilder";
import { retrieveForMessage } from "@/lib/ai/retrieval";
import { buildAttachmentContext } from "@/lib/chat/attachmentContext";
import { sanitizeInput } from "@/lib/ai/guardrails";
import { hasActiveAccess } from "@/lib/billing/access";
import { sendMessageSchema } from "@/lib/validations/chat";
import { NextResponse } from "next/server";
import { after } from "next/server";

// Plafond de messages par utilisateur et par heure — protège contre l'abus
// (coûts OpenAI non bornés sinon). Configurable via env.
const RATE_LIMIT_PER_HOUR = parseInt(
  process.env.CHAT_RATE_LIMIT_PER_HOUR || "60",
  10
);

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

    const isDev = process.env.NODE_ENV === "development";
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Profil + compteur de messages récents (rate limit) en parallèle
    const [{ data: userProfile }, { count: recentMessageCount }] = await Promise.all([
      supabase
        .from("profiles")
        .select("is_active, first_name, role, access_until, has_lifetime_access, payment_state")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("messages")
        .select("id, conversations!inner(user_id)", { count: "exact", head: true })
        .eq("conversations.user_id", user.id)
        .eq("role", "user")
        .gte("created_at", oneHourAgo),
    ]);

    // Les admins testent l'app avec leur propre compte (« Vue utilisateur »)
    // sans passer par Stripe : ils sont exemptés des checks d'abonnement et du
    // rate limit, comme en dev.
    const isAdmin = userProfile?.role === "admin";
    const bypassChecks = isDev || isAdmin;

    if (!bypassChecks && !userProfile?.is_active) {
      return NextResponse.json(
        { success: false, error: { message: "Votre compte est désactivé", code: "ACCOUNT_DISABLED" } },
        { status: 403 }
      );
    }

    // L'accès est une date, pas un statut : un abonné résilié conserve son
    // accès jusqu'à la fin de la période payée, un impayé jusqu'à la fin des
    // relances Stripe. Voir lib/billing/access.ts.
    if (!bypassChecks && !hasActiveAccess(userProfile)) {
      return NextResponse.json(
        { success: false, error: { message: "Abonnement requis pour utiliser le chat", code: "SUBSCRIPTION_REQUIRED" } },
        { status: 403 }
      );
    }

    if (!bypassChecks && (recentMessageCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { success: false, error: { message: "Vous avez envoyé beaucoup de messages en peu de temps. Réessayez dans quelques minutes.", code: "RATE_LIMITED" } },
        { status: 429 }
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
    let convPillarId: string | null = pillarId ?? null;
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
    } else {
      const { data: conv } = await supabase
        .from("conversations")
        .select("pillar_id")
        .eq("id", convId)
        .single();

      if (!conv) {
        return NextResponse.json(
          { success: false, error: { message: "Conversation introuvable", code: "NOT_FOUND" } },
          { status: 404 }
        );
      }
      convPillarId = convPillarId ?? conv.pillar_id;
    }

    const fetchPillarPrePrompt = async (): Promise<string | undefined> => {
      if (!convPillarId) return undefined;
      const { data: pillar } = await supabase
        .from("pillars")
        .select("pre_prompt")
        .eq("id", convPillarId)
        .single();
      return pillar?.pre_prompt ?? undefined;
    };

    // Insert du message user, historique et prompt système en parallèle. Le
    // RAG vient après : sa requête est contextualisée avec l'historique.
    const [userMsgInsert, historyRes, systemPrompt] = await Promise.all([
      supabase
        .from("messages")
        .insert({ conversation_id: convId, role: "user", content: sanitized })
        .select("id")
        .single(),
      supabase
        .from("messages")
        .select("id, role, content")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(51),
      fetchPillarPrePrompt().then((prePrompt) =>
        buildSystemPrompt(prePrompt, userProfile?.first_name ?? undefined)
      ),
    ]);

    if (userMsgInsert.error || !userMsgInsert.data) {
      return NextResponse.json(
        { success: false, error: { message: "Erreur enregistrement du message", code: "DB_ERROR" } },
        { status: 500 }
      );
    }
    const userMessageId = userMsgInsert.data.id;

    // Les 50 messages les plus récents, en ordre chronologique, sans le message
    // courant (présent ou non dans le résultat selon la course avec l'insert).
    const history = (historyRes.data ?? [])
      .filter((m) => m.id !== userMessageId)
      .slice(0, 50)
      .reverse();

    const retrievedChunks = await retrieveForMessage(sanitized, history);
    // Trace de retrieval (logs Vercel) : indispensable pour diagnostiquer les
    // réponses « génériques » — on voit ce que le modèle a réellement reçu.
    console.log(
      `[RAG] ${retrievedChunks.length} extrait(s) pour « ${sanitized.slice(0, 80)} »` +
        (retrievedChunks.length > 0
          ? ` : ${retrievedChunks.map((c) => `${c.documentTitle} (${c.similarity.toFixed(2)})`).join(" | ")}`
          : "")
    );

    // Pièces jointes (message courant + historique récent) : images en parts
    // multimodales pleine résolution, PDF en texte extrait ou en document natif.
    const {
      parts: attachmentParts,
      docTexts,
      skipped,
    } = await buildAttachmentContext(sanitized, history);
    console.log(
      `[PJ] ${attachmentParts.filter((p) => p.type === "image_url").length} image(s), ` +
        `${attachmentParts.filter((p) => p.type === "file").length} PDF natif(s), ` +
        `${docTexts.length} document(s) texte` +
        (skipped.length > 0
          ? ` | écarté(s) : ${skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}`
          : "")
    );

    // Le contexte RAG est injecté dans le dernier message user (et non dans le
    // prompt système) pour garder un préfixe de requête stable → prompt caching.
    const builtUserMessage = buildUserMessage(sanitized, retrievedChunks, docTexts);
    const messages = buildMessages(
      systemPrompt,
      history,
      attachmentParts.length > 0
        ? [{ type: "text" as const, text: builtUserMessage }, ...attachmentParts]
        : builtUserMessage
    );

    // Stream response. request.signal se déclenche quand le client interrompt
    // la génération (bouton Stop) : l'appel au modèle est annulé en amont.
    const provider = getAIProvider();
    const upstream = await provider.stream(messages, { signal: request.signal });

    // Accumulation au fil de l'eau plutôt que stream.tee() : sur une
    // interruption client, la branche de sauvegarde d'un tee ne reçoit pas les
    // chunks déjà émis. On garde donc nous-mêmes le texte transmis, et on
    // sauvegarde exactement ce que l'utilisateur a vu (complet ou partiel).
    const reader = upstream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let resolveCompleted!: (value: string) => void;
    const completed = new Promise<string>((resolve) => (resolveCompleted = resolve));
    let settled = false;
    const settle = () => {
      if (!settled) {
        settled = true;
        resolveCompleted(fullResponse + decoder.decode());
      }
    };

    const streamForClient = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            settle();
            controller.close();
            return;
          }
          fullResponse += decoder.decode(value, { stream: true });
          controller.enqueue(value);
        } catch (err) {
          settle();
          controller.error(err);
        }
      },
      cancel() {
        settle();
        reader.cancel().catch(() => {});
      },
    });

    // Filet de sécurité : si la connexion meurt sans passer par cancel(),
    // l'abort du signal débloque quand même la sauvegarde (léger délai pour
    // laisser les derniers chunks s'accumuler).
    if (request.signal.aborted) {
      setTimeout(settle, 200);
    } else {
      request.signal.addEventListener("abort", () => setTimeout(settle, 200));
    }

    // Sauvegarde de la réponse assistant après l'envoi de la réponse.
    // after() maintient la fonction en vie jusqu'à la fin de la sauvegarde,
    // même si le client se déconnecte en cours de stream.
    after(async () => {
      try {
        const content = await completed;
        if (content.length > 0) {
          const { error } = await supabase.from("messages").insert({
            conversation_id: convId,
            role: "assistant",
            content,
          });
          if (error) console.error("Assistant message save error:", error.message);
        }
      } catch (err) {
        console.error("Assistant message save error:", err);
      }
    });

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
