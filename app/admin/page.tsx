"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  ErrorBox,
  Loading,
  PageHeader,
  StatTile,
  SubscriptionBadge,
  InvoiceBadge,
  SOURCE_LABEL,
  euros,
  relative,
  shortDate,
  useAdminData,
} from "@/components/admin/kit";
import type { PaymentsOverview } from "@/lib/admin/payments";
import type { AccessSource } from "@/types/database";

interface Metrics {
  totalUsers: number;
  usersWithAccess: number;
  pastDue: number;
  expired: number;
  neverSubscribed: number;
  accessBySource: Record<string, number>;
  usersToday: number;
  signups30d: number;
  signupsByDay: Array<{ day: string; count: number }>;
  activeUsers7d: number | null;
  totalConversations: number;
  totalMessages: number;
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const monthLabel = (key: string) => MONTHS[parseInt(key.slice(5, 7), 10) - 1];
const dayLabel = (key: string) => `${parseInt(key.slice(8, 10), 10)}/${key.slice(5, 7)}`;

export default function AdminDashboardPage() {
  const metrics = useAdminData<Metrics>("/api/admin/metrics");
  const payments = useAdminData<PaymentsOverview>("/api/admin/payments");

  const m = metrics.data;
  const p = payments.data;
  const k = p?.kpis;

  return (
    <div className="mx-auto max-w-7xl p-8">
      <PageHeader
        icon={LayoutDashboard}
        title="Tableau de bord"
        description="Revenus en direct de Stripe, utilisateurs et usage de l'IA."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              metrics.reload();
              payments.reload("?refresh=1");
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      {p && !p.livemode && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
          Stripe est en <strong>mode test</strong> : les montants ci-dessous ne sont pas de vrais encaissements.
        </div>
      )}

      {/* Revenus */}
      <section className="mb-8 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revenus</h3>
        {payments.error ? (
          <ErrorBox message={payments.error} onRetry={() => payments.reload("?refresh=1")} />
        ) : !k ? (
          <Loading />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Revenu mensuel récurrent" value={euros(k.mrr)} hint="Abonnements en cours, mensualisés" />
              <StatTile label="Encaissé sur 30 jours" value={euros(k.revenue30d)} hint={`${euros(k.revenue12m)} sur 12 mois`} />
              <StatTile
                label="Abonnés payants"
                value={k.activeSubscriptions}
                hint={`+${k.newSubscriptions30d} nouveaux · −${k.churned30d} terminés (30 j)`}
              />
              <StatTile
                label="À surveiller"
                value={k.pastDue + k.cancelingAtPeriodEnd}
                tone={k.pastDue > 0 ? "warning" : undefined}
                hint={`${k.pastDue} impayé${k.pastDue > 1 ? "s" : ""} · ${k.cancelingAtPeriodEnd} résiliation${k.cancelingAtPeriodEnd > 1 ? "s" : ""} programmée${k.cancelingAtPeriodEnd > 1 ? "s" : ""}`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Encaissements nets par mois</CardTitle>
                  <CardDescription>12 derniers mois, remboursements déduits</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={p.revenueByMonth.map((r) => ({
                      key: r.month,
                      value: r.amount,
                      tooltip: `${monthLabel(r.month)} ${r.month.slice(0, 4)} · ${r.invoices} facture${r.invoices > 1 ? "s" : ""}`,
                    }))}
                    format={(v) => euros(v)}
                    label={monthLabel}
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">Derniers paiements</CardTitle>
                  <Link href="/admin/payments" className="flex items-center gap-1 text-xs font-medium text-golf hover:underline">
                    Tout voir <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardHeader>
                <CardContent className="space-y-1">
                  {p.invoices.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">Aucun paiement pour l&apos;instant</p>
                  )}
                  {p.invoices.slice(0, 6).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{inv.customerName || inv.customerEmail || inv.customerId}</div>
                        <div className="text-xs text-muted-foreground">
                          {inv.offerName ?? "—"} · {shortDate(inv.createdAt)}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-medium tabular-nums">{euros(inv.amountPaid || inv.amountDue, inv.currency)}</span>
                        <InvoiceBadge status={inv.status} refunded={inv.amountRefunded} paid={inv.amountPaid} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      {/* Utilisateurs */}
      <section className="mb-8 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Utilisateurs</h3>
        {metrics.error ? (
          <ErrorBox message={metrics.error} onRetry={() => metrics.reload()} />
        ) : !m ? (
          <Loading />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Comptes" value={m.totalUsers} hint={`+${m.signups30d} sur 30 jours · +${m.usersToday} aujourd'hui`} />
              <StatTile
                label="Avec accès actif"
                value={m.usersWithAccess}
                hint={
                  Object.entries(m.accessBySource)
                    .map(([source, n]) => `${n} ${SOURCE_LABEL[source as AccessSource]?.toLowerCase() ?? source}`)
                    .join(" · ") || "—"
                }
              />
              <StatTile
                label="Actifs sur 7 jours"
                value={m.activeUsers7d ?? "—"}
                hint={m.activeUsers7d === null ? "Migration 021 à appliquer" : "Ont écrit au moins un message"}
              />
              <StatTile
                label="Sans accès"
                value={m.neverSubscribed + m.expired}
                hint={`${m.neverSubscribed} jamais abonnés · ${m.expired} expirés`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Inscriptions par jour</CardTitle>
                  <CardDescription>30 derniers jours</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={m.signupsByDay.map((d) => ({ key: d.day, value: d.count }))}
                    format={(v) => `${v} inscription${v > 1 ? "s" : ""}`}
                    label={dayLabel}
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Usage de l&apos;IA</CardTitle>
                  <CardDescription>Depuis le lancement</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <StatTile label="Conversations" value={m.totalConversations.toLocaleString("fr-FR")} />
                  <StatTile label="Messages" value={m.totalMessages.toLocaleString("fr-FR")} />
                  <div className="col-span-2 text-xs text-muted-foreground">
                    Coûts détaillés dans{" "}
                    <Link href="/admin/ai" className="font-medium text-golf hover:underline">
                      Configuration IA
                    </Link>
                    .
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      {/* Abonnements récents */}
      {p && p.subscriptions.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Derniers abonnements</h3>
          <Card>
            <CardContent className="divide-y p-0">
              {p.subscriptions.slice(0, 5).map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    {s.userId ? (
                      <Link href={`/admin/users/${s.userId}`} className="font-medium hover:underline">
                        {s.customerName || s.customerEmail || s.customerId}
                      </Link>
                    ) : (
                      <span className="font-medium">{s.customerName || s.customerEmail || s.customerId}</span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {s.offerName ?? "—"} · depuis {relative(s.createdAt)}
                    </div>
                  </div>
                  <SubscriptionBadge status={s.status} canceling={s.cancelAtPeriodEnd} />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
