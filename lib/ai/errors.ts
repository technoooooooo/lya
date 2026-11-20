/**
 * Erreur renvoyée par l'API d'un fournisseur IA (OpenAI, Gemini), avec le
 * statut HTTP et le code d'erreur d'origine. Sans eux, la route chat ne peut
 * que renvoyer « Erreur serveur » : c'est ce qui s'est passé quand le crédit
 * OpenAI a été épuisé — tous les élèves voyaient une erreur générique, sans
 * que personne ne sache qu'il suffisait de recharger le compte.
 */
export class AIProviderError extends Error {
  constructor(
    readonly provider: "openai" | "gemini",
    readonly status: number,
    readonly code: string | undefined,
    message: string
  ) {
    super(`${provider} API error: ${status}${code ? ` (${code})` : ""} - ${message}`);
    this.name = "AIProviderError";
  }

  /**
   * Crédit ou quota épuisé : rien ne remarchera avant une action sur le
   * compte du fournisseur (recharge, plan de facturation).
   * OpenAI renvoie 429 avec `insufficient_quota` / `credit_balance_exhausted`,
   * à distinguer du 429 `rate_limit_exceeded`, temporaire.
   */
  get isQuotaExhausted(): boolean {
    return (
      this.code === "insufficient_quota" ||
      this.code === "credit_balance_exhausted" ||
      this.code === "billing_hard_limit_reached"
    );
  }

  /** Trop de requêtes en même temps : se résout seul en quelques secondes. */
  get isRateLimited(): boolean {
    return this.status === 429 && !this.isQuotaExhausted;
  }
}

/** Construit une AIProviderError à partir d'une réponse HTTP en échec. */
export async function toAIProviderError(
  provider: "openai" | "gemini",
  response: Response
): Promise<AIProviderError> {
  const payload = await response.json().catch(() => ({}));
  const err = Array.isArray(payload) ? payload[0]?.error : payload?.error;
  // OpenAI : `code` porte le motif précis (credit_balance_exhausted), `type`
  // le motif général (insufficient_quota). Gemini : `status` (RESOURCE_EXHAUSTED).
  const code: string | undefined =
    typeof err?.code === "string" ? err.code : err?.type || err?.status;
  return new AIProviderError(
    provider,
    response.status,
    err?.type === "insufficient_quota" ? "insufficient_quota" : code,
    err?.message || "Unknown error"
  );
}
