import {
  listLyaInvoices,
  listLyaSubscriptions,
  isLiveMode,
  dashboardUrl,
  type AdminInvoice,
  type AdminSubscription,
} from "@/lib/stripe/admin";

export interface PaymentsOverview {
  livemode: boolean;
  generatedAt: string;
  kpis: {
    mrr: number;
    activeSubscriptions: number;
    trialing: number;
    pastDue: number;
    cancelingAtPeriodEnd: number;
    newSubscriptions30d: number;
    churned30d: number;
    revenue30d: number;
    revenue12m: number;
    refunded12m: number;
  };
  /** Encaissements nets (payés − remboursés), du plus ancien au mois courant. */
  revenueByMonth: Array<{ month: string; amount: number; invoices: number }>;
  subscriptions: AdminSubscription[];
  invoices: AdminInvoice[];
  dashboard: { subscriptions: string; payments: string; coupons: string };
}

// Les listes Stripe sont lentes à parcourir (compte partagé avec systeme.io) :
// un cache court évite de tout relire à chaque changement d'onglet.
const TTL_MS = 60_000;
let cache: { at: number; value: PaymentsOverview } | null = null;

export function invalidatePaymentsCache() {
  cache = null;
}

const LIVE_STATUSES = new Set(["active", "past_due"]);

export async function paymentsOverview(force = false): Promise<PaymentsOverview> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const [subscriptions, invoices] = await Promise.all([listLyaSubscriptions(), listLyaInvoices(12)]);

  const now = Date.now();
  const since30 = now - 30 * 86_400_000;
  const within30 = (date: string | null) => Boolean(date && new Date(date).getTime() >= since30);

  const live = subscriptions.filter((s) => LIVE_STATUSES.has(s.status));
  const paid = invoices.filter((i) => i.status === "paid" && i.amountPaid > 0);
  const net = (i: AdminInvoice) => i.amountPaid - i.amountRefunded;

  const months: PaymentsOverview["revenueByMonth"] = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    months.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, amount: 0, invoices: 0 });
  }
  const byMonth = new Map(months.map((m) => [m.month, m]));
  for (const invoice of paid) {
    const bucket = byMonth.get(invoice.createdAt.slice(0, 7));
    if (bucket) {
      bucket.amount += net(invoice);
      bucket.invoices += 1;
    }
  }

  const value: PaymentsOverview = {
    livemode: isLiveMode(),
    generatedAt: new Date().toISOString(),
    kpis: {
      mrr: live.reduce((sum, s) => sum + s.monthlyAmount, 0),
      activeSubscriptions: live.length,
      trialing: subscriptions.filter((s) => s.status === "trialing").length,
      pastDue: subscriptions.filter((s) => s.status === "past_due").length,
      cancelingAtPeriodEnd: live.filter((s) => s.cancelAtPeriodEnd).length,
      newSubscriptions30d: subscriptions.filter((s) => within30(s.createdAt)).length,
      churned30d: subscriptions.filter((s) => within30(s.endedAt)).length,
      revenue30d: paid.filter((i) => within30(i.createdAt)).reduce((sum, i) => sum + net(i), 0),
      revenue12m: paid.reduce((sum, i) => sum + net(i), 0),
      refunded12m: invoices.reduce((sum, i) => sum + i.amountRefunded, 0),
    },
    revenueByMonth: months,
    subscriptions,
    invoices,
    dashboard: {
      subscriptions: dashboardUrl("subscriptions"),
      payments: dashboardUrl("payments"),
      coupons: dashboardUrl("coupons"),
    },
  };

  cache = { at: now, value };
  return value;
}
