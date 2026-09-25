import { stripeApi, StripeApiError } from "./api";
import { serverEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { LYA_MARKER_KEY, LYA_MARKER_VALUE } from "@/lib/billing/catalog";

/**
 * Lectures et actions Stripe du back-office.
 *
 * Le compte clickandgolf.fr est partagé avec systeme.io : chaque liste est
 * filtrée sur les prix présents dans la table offers, et chaque écriture
 * (résiliation, remboursement, coupon) vérifie d'abord que l'objet visé
 * appartient bien à Lya. Rien de ce qui relève des formations n'est affiché
 * ni modifiable ici.
 *
 * La version d'API est épinglée : les formes d'objets ci-dessous (invoice.charge,
 * lines.price, promotion_code.coupon, current_period_end) ne dépendent ainsi
 * pas de la version par défaut du compte, qui a déjà bougé une fois.
 */
const VERSION = { stripeVersion: "2024-06-20" };

export class ForeignStripeObjectError extends Error {
  constructor(what: string) {
    super(`${what} n'appartient pas à Lya : action refusée (compte Stripe partagé avec systeme.io).`);
    this.name = "ForeignStripeObjectError";
  }
}

// --- Formes (version 2024-06-20) --------------------------------------------

interface Price {
  id: string;
  product: string;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string; interval_count: number } | null;
}

interface Coupon {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: "once" | "repeating" | "forever";
  duration_in_months: number | null;
  valid: boolean;
  times_redeemed: number;
  metadata: Record<string, string>;
  applies_to?: { products: string[] };
}

interface Customer {
  id: string;
  email: string | null;
  name: string | null;
  metadata: Record<string, string>;
  deleted?: boolean;
}

interface Subscription {
  id: string;
  customer: string | Customer;
  status: string;
  cancel_at_period_end: boolean;
  cancel_at: number | null;
  canceled_at: number | null;
  ended_at: number | null;
  created: number;
  start_date: number;
  current_period_end: number;
  trial_end: number | null;
  discount: { coupon: Coupon } | null;
  items: { data: Array<{ price: Price }> };
  metadata: Record<string, string>;
  latest_invoice: string | null;
}

interface Charge {
  id: string;
  amount: number;
  amount_refunded: number;
  refunded: boolean;
  receipt_url: string | null;
}

interface Invoice {
  id: string;
  number: string | null;
  customer: string;
  customer_email: string | null;
  customer_name: string | null;
  subscription: string | null;
  status: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  billing_reason: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  charge: string | Charge | null;
  lines: { data: Array<{ price: Price | null }> };
}

interface PromotionCode {
  id: string;
  code: string;
  active: boolean;
  coupon: Coupon;
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: number | null;
  created: number;
  restrictions: { first_time_transaction: boolean };
  metadata: Record<string, string>;
}

interface List<T> {
  data: T[];
  has_more: boolean;
}

// --- Formes renvoyées à l'admin --------------------------------------------

export interface AdminSubscription {
  id: string;
  customerId: string;
  customerEmail: string | null;
  customerName: string | null;
  userId: string | null;
  status: string;
  offerName: string | null;
  priceId: string | null;
  amount: number;
  currency: string;
  interval: string | null;
  intervalCount: number;
  /** Montant mensualisé, remise permanente déduite. */
  monthlyAmount: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  endedAt: string | null;
  createdAt: string;
  trialEnd: string | null;
  discount: string | null;
}

export interface AdminInvoice {
  id: string;
  number: string | null;
  customerId: string;
  customerEmail: string | null;
  customerName: string | null;
  subscriptionId: string | null;
  status: string | null;
  amountPaid: number;
  amountDue: number;
  amountRefunded: number;
  currency: string;
  createdAt: string;
  billingReason: string | null;
  hostedUrl: string | null;
  pdfUrl: string | null;
  chargeId: string | null;
  offerName: string | null;
}

export interface AdminPromotionCode {
  id: string;
  code: string;
  active: boolean;
  couponId: string;
  couponName: string | null;
  discountLabel: string;
  durationLabel: string;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: string | null;
  createdAt: string;
  firstTimeOnly: boolean;
}

// --- Utilitaires -------------------------------------------------------------

const iso = (ts: number | null | undefined) => (ts ? new Date(ts * 1000).toISOString() : null);

export function isLiveMode(): boolean {
  return (serverEnv("STRIPE_SECRET_KEY") ?? "").includes("_live_");
}

/** Lien vers l'objet dans le dashboard Stripe, dans le bon mode. */
export function dashboardUrl(path: string): string {
  return `https://dashboard.stripe.com/${isLiveMode() ? "" : "test/"}${path.replace(/^\//, "")}`;
}

/** Parcourt une liste paginée Stripe, dans une limite de pages. */
async function listAll<T extends { id: string }>(
  path: string,
  params: Record<string, unknown>,
  maxPages = 10
): Promise<T[]> {
  const items: T[] = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const result = await stripeApi.get<List<T>>(
      path,
      { limit: 100, ...params, ...(startingAfter ? { starting_after: startingAfter } : {}) },
      VERSION
    );
    items.push(...result.data);
    if (!result.has_more || result.data.length === 0) break;
    startingAfter = result.data[result.data.length - 1].id;
  }

  return items;
}

/** Prix Lya connus (offres actives ou non) → nom d'offre. */
type CatalogEntry = { offerName: string; productId: string | null; active: boolean };

export async function lyaPriceCatalog(): Promise<Map<string, CatalogEntry>> {
  const { data } = await getSupabaseAdmin()
    .from("offers")
    .select("stripe_price_id, stripe_product_id, display_name, is_active");

  const map = new Map<string, CatalogEntry>();
  for (const row of data ?? []) {
    if (row.stripe_price_id) {
      map.set(row.stripe_price_id, {
        offerName: row.display_name,
        productId: row.stripe_product_id,
        active: row.is_active,
      });
    }
  }
  return map;
}

function monthly(amount: number, interval: string | null, count: number): number {
  switch (interval) {
    case "year":
      return amount / (12 * count);
    case "week":
      return (amount * 52) / (12 * count);
    case "day":
      return (amount * 365) / (12 * count);
    default:
      return amount / count;
  }
}

export function couponDiscountLabel(coupon: Pick<Coupon, "percent_off" | "amount_off" | "currency">): string {
  if (coupon.percent_off) return `−${coupon.percent_off} %`;
  if (coupon.amount_off) {
    return `−${new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: (coupon.currency ?? "eur").toUpperCase(),
    }).format(coupon.amount_off / 100)}`;
  }
  return "—";
}

export function couponDurationLabel(coupon: Pick<Coupon, "duration" | "duration_in_months">): string {
  if (coupon.duration === "once") return "1re échéance";
  if (coupon.duration === "forever") return "Toujours";
  return `${coupon.duration_in_months} mois`;
}

function toAdminSubscription(
  sub: Subscription,
  catalog: Map<string, { offerName: string }>
): AdminSubscription {
  const price = sub.items.data[0]?.price ?? null;
  const customer = typeof sub.customer === "string" ? null : sub.customer;
  const amount = price?.unit_amount ?? 0;
  const interval = price?.recurring?.interval ?? null;
  const intervalCount = price?.recurring?.interval_count ?? 1;

  // Remise : seule une remise permanente pèse durablement sur le MRR.
  const coupon = sub.discount?.coupon ?? null;
  let net = amount;
  if (coupon && coupon.duration !== "once") {
    if (coupon.percent_off) net = amount * (1 - coupon.percent_off / 100);
    else if (coupon.amount_off) net = Math.max(0, amount - coupon.amount_off);
  }

  return {
    id: sub.id,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    customerEmail: customer?.email ?? null,
    customerName: customer?.name ?? null,
    userId: sub.metadata?.user_id ?? customer?.metadata?.user_id ?? null,
    status: sub.status,
    offerName: price ? (catalog.get(price.id)?.offerName ?? null) : null,
    priceId: price?.id ?? null,
    amount,
    currency: price?.currency ?? "eur",
    interval,
    intervalCount,
    monthlyAmount: Math.round(monthly(net, interval, intervalCount)),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    currentPeriodEnd: iso(sub.current_period_end),
    canceledAt: iso(sub.canceled_at),
    endedAt: iso(sub.ended_at),
    createdAt: iso(sub.created)!,
    trialEnd: iso(sub.trial_end),
    discount: coupon
      ? `${coupon.name ?? coupon.id} (${couponDiscountLabel(coupon)}, ${couponDurationLabel(coupon)})`
      : null,
  };
}

function toAdminInvoice(inv: Invoice, catalog: Map<string, { offerName: string }>): AdminInvoice {
  const charge = inv.charge && typeof inv.charge === "object" ? inv.charge : null;
  const priceId = inv.lines.data.find((l) => l.price)?.price?.id ?? null;

  return {
    id: inv.id,
    number: inv.number,
    customerId: inv.customer,
    customerEmail: inv.customer_email,
    customerName: inv.customer_name,
    subscriptionId: inv.subscription,
    status: inv.status,
    amountPaid: inv.amount_paid,
    amountDue: inv.amount_due,
    amountRefunded: charge?.amount_refunded ?? 0,
    currency: inv.currency,
    createdAt: iso(inv.created)!,
    billingReason: inv.billing_reason,
    hostedUrl: inv.hosted_invoice_url,
    pdfUrl: inv.invoice_pdf,
    chargeId: charge?.id ?? (typeof inv.charge === "string" ? inv.charge : null),
    offerName: priceId ? (catalog.get(priceId)?.offerName ?? null) : null,
  };
}

const isLyaInvoice = (inv: Invoice, catalog: Map<string, unknown>) =>
  inv.lines.data.some((line) => line.price && catalog.has(line.price.id));

// --- Lectures ------------------------------------------------------------------

/** Tous les abonnements Stripe portant un prix Lya, tous statuts confondus. */
export async function listLyaSubscriptions(): Promise<AdminSubscription[]> {
  const catalog = await lyaPriceCatalog();
  const lists = await Promise.all(
    [...catalog.keys()].map((price) =>
      listAll<Subscription>("/subscriptions", {
        price,
        status: "all",
        expand: ["data.customer"],
      }).catch((error) => {
        // Prix de test sous clé live (ou l'inverse) : on l'ignore plutôt que de tout faire échouer.
        if (error instanceof StripeApiError && error.status === 400) return [];
        throw error;
      })
    )
  );

  const seen = new Set<string>();
  return lists
    .flat()
    .filter((sub) => (seen.has(sub.id) ? false : (seen.add(sub.id), true)))
    .map((sub) => toAdminSubscription(sub, catalog))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Factures Lya des `months` derniers mois. Stripe ne sait pas filtrer les
 * factures par prix : on parcourt celles du compte et on écarte tout ce qui
 * relève de systeme.io.
 */
export async function listLyaInvoices(months = 12): Promise<AdminInvoice[]> {
  const catalog = await lyaPriceCatalog();
  const since = Math.floor(Date.now() / 1000) - months * 31 * 86_400;

  const invoices = await listAll<Invoice>(
    "/invoices",
    { created: { gte: since }, expand: ["data.charge"] },
    25
  );

  return invoices.filter((inv) => isLyaInvoice(inv, catalog)).map((inv) => toAdminInvoice(inv, catalog));
}

export interface CustomerBilling {
  customer: { id: string; email: string | null; name: string | null; dashboardUrl: string } | null;
  subscriptions: AdminSubscription[];
  invoices: AdminInvoice[];
}

/** Vue Stripe d'un utilisateur : son client, ses abonnements et factures Lya. */
export async function customerBilling(customerId: string | null): Promise<CustomerBilling> {
  if (!customerId) return { customer: null, subscriptions: [], invoices: [] };

  let customer: Customer;
  try {
    customer = await stripeApi.get<Customer>(`/customers/${customerId}`, undefined, VERSION);
  } catch (error) {
    if (error instanceof StripeApiError && error.status === 404) {
      return { customer: null, subscriptions: [], invoices: [] };
    }
    throw error;
  }
  if (customer.deleted) return { customer: null, subscriptions: [], invoices: [] };

  const catalog = await lyaPriceCatalog();
  const [subs, invoices] = await Promise.all([
    listAll<Subscription>("/subscriptions", {
      customer: customerId,
      status: "all",
    }, 2),
    listAll<Invoice>("/invoices", { customer: customerId, expand: ["data.charge"] }, 2),
  ]);

  return {
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      dashboardUrl: dashboardUrl(`customers/${customer.id}`),
    },
    subscriptions: subs
      .filter((s) => s.items.data.some((i) => catalog.has(i.price.id)))
      .map((s) => toAdminSubscription({ ...s, customer }, catalog)),
    invoices: invoices.filter((i) => isLyaInvoice(i, catalog)).map((i) => toAdminInvoice(i, catalog)),
  };
}

// --- Actions ---------------------------------------------------------------------

async function assertLyaSubscription(subscriptionId: string): Promise<Subscription> {
  const [sub, catalog] = await Promise.all([
    stripeApi.get<Subscription>(`/subscriptions/${subscriptionId}`, undefined, VERSION),
    lyaPriceCatalog(),
  ]);
  if (!sub.items.data.some((item) => catalog.has(item.price.id))) {
    throw new ForeignStripeObjectError(`L'abonnement ${subscriptionId}`);
  }
  return sub;
}

export type SubscriptionAction = "cancel_at_period_end" | "resume" | "cancel_now";

export async function applySubscriptionAction(subscriptionId: string, action: SubscriptionAction) {
  await assertLyaSubscription(subscriptionId);

  if (action === "cancel_now") {
    // Le webhook customer.subscription.deleted fera le reste (grant conservé
    // jusqu'au terme payé, sauf impayé).
    return stripeApi.delete(`/subscriptions/${subscriptionId}`, VERSION);
  }
  return stripeApi.post(
    `/subscriptions/${subscriptionId}`,
    { cancel_at_period_end: action === "cancel_at_period_end" },
    VERSION
  );
}

/** Remboursement (total ou partiel) du paiement d'une facture Lya. */
export async function refundInvoice(invoiceId: string, amount?: number) {
  const [invoice, catalog] = await Promise.all([
    stripeApi.get<Invoice>(`/invoices/${invoiceId}`, undefined, VERSION),
    lyaPriceCatalog(),
  ]);
  if (!isLyaInvoice(invoice, catalog)) throw new ForeignStripeObjectError(`La facture ${invoiceId}`);

  const chargeId = typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id;
  if (!chargeId) throw new Error("Cette facture n'a pas de paiement à rembourser.");

  return stripeApi.post(
    "/refunds",
    { charge: chargeId, ...(amount ? { amount } : {}), metadata: { refunded_from: "lya_admin" } },
    { ...VERSION, idempotencyKey: `refund:${chargeId}:${amount ?? "full"}:${Math.floor(Date.now() / 60_000)}` }
  );
}

// --- Codes promo Stripe ---------------------------------------------------------

const isLyaCoupon = (coupon: Coupon) => coupon.metadata?.[LYA_MARKER_KEY] === LYA_MARKER_VALUE;

function toAdminPromotionCode(pc: PromotionCode): AdminPromotionCode {
  return {
    id: pc.id,
    code: pc.code,
    active: pc.active,
    couponId: pc.coupon.id,
    couponName: pc.coupon.name,
    discountLabel: couponDiscountLabel(pc.coupon),
    durationLabel: couponDurationLabel(pc.coupon),
    maxRedemptions: pc.max_redemptions,
    timesRedeemed: pc.times_redeemed,
    expiresAt: iso(pc.expires_at),
    createdAt: iso(pc.created)!,
    firstTimeOnly: pc.restrictions?.first_time_transaction ?? false,
  };
}

/** Codes promo créés par Lya — jamais ceux de systeme.io (coupons SI-*). */
export async function listLyaPromotionCodes(): Promise<AdminPromotionCode[]> {
  const codes = await listAll<PromotionCode>("/promotion_codes", {}, 5);
  return codes.filter((pc) => isLyaCoupon(pc.coupon)).map(toAdminPromotionCode);
}

export interface PromotionCodeDraft {
  code: string;
  name?: string;
  percentOff?: number;
  amountOffCents?: number;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number;
  maxRedemptions?: number;
  expiresAt?: string;
  firstTimeOnly?: boolean;
  createdBy: string;
}

/**
 * Crée un coupon marqué Lya, limité aux produits Lya (il ne peut donc pas
 * servir sur une formation systeme.io), puis le code saisissable au Checkout.
 */
export async function createLyaPromotionCode(draft: PromotionCodeDraft): Promise<AdminPromotionCode> {
  const catalog = await lyaPriceCatalog();
  // Offres actives seulement : les offres de démonstration pointent sur des
  // produits du mode test, inconnus sous la clé live.
  const products = [
    ...new Set([...catalog.values()].filter((v) => v.active).map((v) => v.productId)),
  ].filter(Boolean) as string[];
  if (products.length === 0) throw new Error("Aucune offre active : impossible de rattacher le code à un produit.");

  const coupon = await stripeApi.post<Coupon>(
    "/coupons",
    {
      name: draft.name || draft.code,
      ...(draft.percentOff
        ? { percent_off: draft.percentOff }
        : { amount_off: draft.amountOffCents, currency: "eur" }),
      duration: draft.duration,
      ...(draft.duration === "repeating" ? { duration_in_months: draft.durationInMonths } : {}),
      applies_to: { products },
      metadata: { [LYA_MARKER_KEY]: LYA_MARKER_VALUE, created_by: draft.createdBy },
    },
    VERSION
  );

  try {
    const promotionCode = await stripeApi.post<PromotionCode>(
      "/promotion_codes",
      {
        coupon: coupon.id,
        code: draft.code,
        ...(draft.maxRedemptions ? { max_redemptions: draft.maxRedemptions } : {}),
        ...(draft.expiresAt ? { expires_at: Math.floor(new Date(draft.expiresAt).getTime() / 1000) } : {}),
        ...(draft.firstTimeOnly ? { restrictions: { first_time_transaction: true } } : {}),
        metadata: { [LYA_MARKER_KEY]: LYA_MARKER_VALUE },
      },
      VERSION
    );
    return toAdminPromotionCode(promotionCode);
  } catch (error) {
    // Code déjà pris, par exemple : on ne laisse pas un coupon orphelin derrière.
    await stripeApi.delete(`/coupons/${coupon.id}`, VERSION).catch(() => undefined);
    throw error;
  }
}

/**
 * Code de réduction Lya utilisable, recherché par sa saisie (Stripe compare
 * sans tenir compte de la casse). Sert à l'inscription : un élève qui tape un
 * code de réduction dans le champ « code d'accès » part au Checkout avec la
 * remise déjà appliquée au lieu d'être renvoyé en arrière.
 */
export async function findUsableLyaPromotionCode(
  rawCode: string
): Promise<{ id: string; code: string } | null> {
  const code = rawCode.trim();
  if (!code) return null;

  const { data } = await stripeApi.get<List<PromotionCode>>(
    "/promotion_codes",
    { code, active: true, limit: 10 },
    VERSION
  );
  const now = Date.now() / 1000;
  const usable = data.find(
    (pc) =>
      isLyaCoupon(pc.coupon) &&
      pc.coupon.valid &&
      (!pc.expires_at || pc.expires_at > now) &&
      (pc.max_redemptions === null || pc.times_redeemed < pc.max_redemptions)
  );
  return usable ? { id: usable.id, code: usable.code } : null;
}

/** Active ou désactive un code (un code Stripe ne se supprime pas). */
export async function setPromotionCodeActive(id: string, active: boolean): Promise<AdminPromotionCode> {
  const current = await stripeApi.get<PromotionCode>(`/promotion_codes/${id}`, undefined, VERSION);
  if (!isLyaCoupon(current.coupon)) throw new ForeignStripeObjectError(`Le code ${current.code}`);

  const updated = await stripeApi.post<PromotionCode>(`/promotion_codes/${id}`, { active }, VERSION);
  return toAdminPromotionCode(updated);
}
