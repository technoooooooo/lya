import { serverEnv } from "@/lib/env";

// Appels directs à l'API Stripe, sans le SDK — même parti pris que
// lib/ai/openai.ts : une dépendance de moins, et le contrôle du payload.

const API_BASE = "https://api.stripe.com/v1";

function apiKey(): string {
  const key = serverEnv("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante");
  return key;
}

/**
 * Encode un objet en x-www-form-urlencoded au format attendu par Stripe :
 * les objets imbriqués deviennent `parent[enfant]`, les tableaux `champ[0]`.
 */
function encodeForm(data: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;

    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === "object") {
          parts.push(...encodeForm(item as Record<string, unknown>, `${name}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      parts.push(...encodeForm(value as Record<string, unknown>, name));
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }

  return parts;
}

export class StripeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "StripeApiError";
  }
}

interface RequestOptions {
  idempotencyKey?: string;
  /** Épingle la forme des objets renvoyés, indépendamment de la version du compte. */
  stripeVersion?: string;
}

async function request<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  data?: Record<string, unknown>,
  options?: RequestOptions
): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey()}` };
  let url = `${API_BASE}${path}`;
  let body: string | undefined;

  if (data) {
    const encoded = encodeForm(data).join("&");
    if (method === "GET") {
      url += `?${encoded}`;
    } else {
      body = encoded;
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  }

  // Stripe déduplique les créations rejouées (retry réseau) sur cette clé.
  if (options?.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  if (options?.stripeVersion) headers["Stripe-Version"] = options.stripeVersion;

  const response = await fetch(url, { method, headers, body });
  const payload = await response.json();

  if (!response.ok) {
    const error = payload?.error ?? {};
    throw new StripeApiError(
      error.message ?? `Erreur Stripe ${response.status}`,
      response.status,
      error.code
    );
  }

  return payload as T;
}

export const stripeApi = {
  get: <T>(path: string, params?: Record<string, unknown>, options?: RequestOptions) =>
    request<T>("GET", path, params, options),
  post: <T>(path: string, data?: Record<string, unknown>, options?: RequestOptions) =>
    request<T>("POST", path, data, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};

// --- Formes minimales des objets Stripe utilisés ---------------------------

export interface StripePrice {
  id: string;
  product: string;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string; interval_count: number } | null;
  metadata: Record<string, string>;
}

export interface StripeSubscriptionItem {
  id: string;
  price: StripePrice;
  /** Depuis l'API 2025-03-31, la période vit sur l'item et non sur l'abonnement. */
  current_period_end?: number;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  /** Absent des versions récentes de l'API — voir subscriptionPeriodEnd(). */
  current_period_end?: number;
  items: { data: StripeSubscriptionItem[] };
  metadata: Record<string, string>;
}

export interface StripeCheckoutSession {
  id: string;
  mode: "payment" | "subscription" | "setup";
  customer: string | null;
  customer_details: { email: string | null } | null;
  client_reference_id: string | null;
  subscription: string | null;
  payment_intent: string | null;
  payment_status: string;
  metadata: Record<string, string>;
}

export interface StripeInvoice {
  id: string;
  customer: string;
  /** Champ historique ; déplacé sous `parent` dans les versions récentes. */
  subscription?: string | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  lines: { data: Array<{ price?: StripePrice | null }> };
}

/**
 * Fin de la période en cours, quelle que soit la version d'API qui a produit
 * l'objet : Stripe a déplacé `current_period_end` de l'abonnement vers ses
 * items en 2025-03-31. Lire une seule des deux places casse silencieusement
 * le renouvellement selon la version configurée sur le compte.
 */
export function subscriptionPeriodEnd(subscription: StripeSubscription): Date | null {
  const timestamp =
    subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
  return timestamp ? new Date(timestamp * 1000) : null;
}

/** Même précaution pour l'abonnement rattaché à une facture. */
export function invoiceSubscriptionId(invoice: StripeInvoice): string | null {
  return invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null;
}

/** Le premier price d'un abonnement — Lya ne vend pas d'offres multi-lignes. */
export function subscriptionPriceId(subscription: StripeSubscription): string | null {
  return subscription.items?.data?.[0]?.price?.id ?? null;
}

export function retrieveSubscription(id: string) {
  return stripeApi.get<StripeSubscription>(`/subscriptions/${id}`);
}

export interface StripeCustomer {
  id: string;
  email: string | null;
  metadata: Record<string, string>;
}

export function retrieveCustomer(id: string) {
  return stripeApi.get<StripeCustomer>(`/customers/${id}`);
}

export function retrieveCheckoutSession(id: string) {
  return stripeApi.get<StripeCheckoutSession>(`/checkout/sessions/${id}`);
}

/** Les line items ne sont pas inclus dans l'objet session reçu par webhook. */
export async function checkoutSessionPriceId(sessionId: string): Promise<string | null> {
  const result = await stripeApi.get<{ data: Array<{ price: StripePrice | null }> }>(
    `/checkout/sessions/${sessionId}/line_items`,
    { limit: 1 }
  );
  return result.data?.[0]?.price?.id ?? null;
}
