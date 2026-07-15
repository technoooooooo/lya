import type { AIMessage } from "./types";
import type { RetrievedChunk } from "./retrieval";
import { createClient } from "@/lib/supabase/server";

// Budget de caractères pour l'historique de conversation envoyé au modèle
// (~3k tokens). Évite que les longues conversations fassent exploser le coût
// d'input à chaque message.
const MAX_HISTORY_CHARS = 12000;

/**
 * Construit le message système. Il ne contient QUE des éléments stables pour
 * toute la durée d'une conversation (noyau, utilisateur, pilier, garde-fous) :
 * le contexte RAG, qui change à chaque message, est injecté dans le dernier
 * message utilisateur (voir buildUserMessage). Ce découpage rend le préfixe de
 * la requête stable d'un message à l'autre et permet au prompt caching
 * d'OpenAI de s'appliquer (≈ -50 % sur les tokens d'input cachés + latence).
 */
export async function buildSystemPrompt(
  pillarPrePrompt?: string,
  userName?: string
): Promise<string> {
  const supabase = await createClient();

  const [{ data: config }, { data: guardrails }] = await Promise.all([
    supabase.from("ai_config").select("value").eq("key", "system_prompt").single(),
    // Ordre déterministe : un ordre de lignes qui varie changerait le prompt
    // d'un appel à l'autre et casserait le prompt caching.
    supabase
      .from("guardrails")
      .select("type, subject, description")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  const systemPrompt = config?.value || "Tu es Lya, assistant IA dédié au coaching golf.";

  let fullPrompt = systemPrompt;

  // L'identité et la posture vivent dans le prompt système géré en base
  // (ai_config.system_prompt) — rien n'est codé en dur ici pour éviter toute
  // contradiction avec le prompt édité par l'admin.

  if (userName) {
    fullPrompt += `\n\n## Utilisateur actuel\nL'utilisateur qui te parle s'appelle ${userName}. Adresse-toi à lui/elle par son prénom.`;
  }

  if (pillarPrePrompt) {
    fullPrompt += `\n\n## Contexte du pilier\n${pillarPrePrompt}`;
  }

  // Garde-fous
  if (guardrails && guardrails.length > 0) {
    const forbidden = guardrails.filter((g) => g.type === "forbidden");
    const exceptions = guardrails.filter((g) => g.type === "exception");

    if (forbidden.length > 0) {
      fullPrompt += "\n\n## Sujets interdits\nTu dois refuser poliment de répondre sur ces sujets et rediriger vers les 5 piliers :\n";
      for (const g of forbidden) {
        fullPrompt += `- ${g.subject}${g.description ? ` : ${g.description}` : ""}\n`;
      }
    }

    if (exceptions.length > 0) {
      fullPrompt += "\n\n## Exceptions autorisées\nTu peux aborder ces sujets dans le cadre défini :\n";
      for (const g of exceptions) {
        fullPrompt += `- ${g.subject}${g.description ? ` : ${g.description}` : ""}\n`;
      }
    }
  }

  // Instruction statique sur la base de connaissances : les extraits eux-mêmes
  // (dynamiques) arrivent dans le dernier message utilisateur.
  fullPrompt +=
    "\n\n## Base de connaissances\n" +
    "Quand des extraits pertinents de la base de connaissances officielle existent, ils te sont fournis en tête du dernier message de l'utilisateur, dans une section « Ressources de la base de connaissances » (invisible pour lui). Ces extraits sont ta source prioritaire : appuie-toi dessus pour répondre et cite la ressource concernée quand c'est utile. " +
    "Si aucun extrait n'est fourni ou qu'ils ne couvrent pas la question, appuie-toi uniquement sur les principes de la méthode définis ci-dessus et reconnais honnêtement quand une information précise te manque — n'invente jamais un contenu comme faisant partie de la méthode.";

  return fullPrompt;
}

/**
 * Construit le contenu du dernier message utilisateur envoyé au modèle :
 * les passages RAG récupérés (s'il y en a) suivis du message réel.
 * Seul le message brut de l'utilisateur est sauvegardé en base — le contexte
 * RAG n'est donc jamais rejoué dans l'historique des tours suivants.
 */
export function buildUserMessage(
  userMessage: string,
  retrievedChunks: RetrievedChunk[]
): string {
  if (retrievedChunks.length === 0) return userMessage;

  let content =
    "## Ressources de la base de connaissances\nExtraits récupérés automatiquement pour leur pertinence avec le message ci-dessous (l'utilisateur ne les voit pas) :\n";
  for (const chunk of retrievedChunks) {
    content += `\n### Source : ${chunk.documentTitle}\n${chunk.content}\n`;
  }
  content += `\n## Message de l'utilisateur\n${userMessage}`;
  return content;
}

export function buildMessages(
  systemPrompt: string,
  conversationHistory: { role: string; content: string }[],
  finalUserContent: string
): AIMessage[] {
  // Fenêtre d'historique bornée en caractères, en gardant les messages les
  // plus récents (au moins un, même s'il dépasse le budget).
  const windowed: { role: string; content: string }[] = [];
  let total = 0;
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    total += conversationHistory[i].content.length;
    if (total > MAX_HISTORY_CHARS && windowed.length > 0) break;
    windowed.unshift(conversationHistory[i]);
  }
  // Gemini exige que la conversation commence par un message utilisateur.
  while (windowed.length > 0 && windowed[0].role === "assistant") {
    windowed.shift();
  }

  const messages: AIMessage[] = [{ role: "system", content: systemPrompt }];

  for (const msg of windowed) {
    messages.push({
      role: msg.role as AIMessage["role"],
      content: msg.content,
    });
  }

  messages.push({ role: "user", content: finalUserContent });

  return messages;
}
