"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, ExternalLink, FileText, RefreshCw, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ErrorBox,
  FilterChips,
  InvoiceBadge,
  Loading,
  PageHeader,
  StatTile,
  SubscriptionBadge,
  Td,
  Th,
  dateTime,
  euros,
  intervalLabel,
  relative,
  shortDate,
  useAdminData,
} from "@/components/admin/kit";
import type { PaymentsOverview } from "@/lib/admin/payments";
import type { AdminSubscription } from "@/lib/stripe/admin";

type SubFilter = "live" | "canceling" | "past_due" | "trialing" | "ended" | "all";

const SUB_FILTERS: Array<{ key: SubFilter; label: string; match: (s: AdminSubscription) => boolean }> = [
  { key: "live", label: "En cours", match: (s) => ["active", "past_due", "trialing"].includes(s.status) },
  { key: "canceling", label: "Résiliation programmée", match: (s) => s.cancelAtPeriodEnd && !s.endedAt },
  { key: "past_due", label: "Impayés", match: (s) => s.status === "past_due" || s.status === "unpaid" },
  { key: "trialing", label: "Essai", match: (s) => s.status === "trialing" },
  { key: "ended", label: "Terminés", match: (s) => Boolean(s.endedAt) || s.status === "canceled" },
  { key: "all", label: "Tous", match: () => true },
];

function Customer({ userId, name, email, fallback }: { userId: string | null; name: string | null; email: string | null; fallback: string }) {
  const label = name || email || fallback;
  return (
    <div className="min-w-0">
      {userId ? (
        <Link href={`/admin/users/${userId}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
          {label}
        </Link>
      ) : (
        <span className="font-medium">{label}</span>
      )}
      {name && email && <div className="truncate text-xs text-muted-foreground">{email}</div>}
    </div>
  );
}

export default function AdminPaymentsPage() {
  const { data, error, isLoading, reload } = useAdminData<PaymentsOverview>("/api/admin/payments");
  const [subFilter, setSubFilter] = useState<SubFilter>("live");
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const matchesSearch = (...values: Array<string | null>) => !q || values.some((v) => v?.toLowerCase().includes(q));

  const subscriptions = useMemo(() => {
    const match = SUB_FILTERS.find((f) => f.key === subFilter)!.match;
    return (data?.subscriptions ?? []).filter(
      (s) => match(s) && matchesSearch(s.customerName, s.customerEmail, s.customerId, s.offerName)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, subFilter, q]);

  const invoices = useMemo(
    () => (data?.invoices ?? []).filter((i) => matchesSearch(i.customerName, i.customerEmail, i.number, i.offerName)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, q]
  );

  // Rattachement facture → compte Lya, via les abonnements déjà chargés.
  const userBySubscription = useMemo(
    () => new Map((data?.subscriptions ?? []).map((s) => [s.id, s.userId])),
    [data]
  );

  const k = data?.kpis;

  return (
    <div className="mx-auto max-w-7xl p-8">
      <PageHeader
        icon={CreditCard}
        title="Paiements"
        description="Abonnements et factures Lya, en direct de Stripe. Les ventes systeme.io du même compte ne sont pas affichées."
        actions={
          <>
            {data && (
              <span className="text-xs text-muted-foreground">Mis à jour {relative(data.generatedAt)}</span>
            )}
            <Button variant="outline" size="sm" onClick={() => reload("?refresh=1")} disabled={isLoading}>
              <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Actualiser
            </Button>
            {data && (
              <Button variant="outline" size="sm" asChild>
                <a href={data.dashboard.subscriptions} target="_blank" rel="noreferrer">
                  Stripe <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </>
        }
      />

      {data && !data.livemode && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
          Stripe est en <strong>mode test</strong>.
        </div>
      )}

      {error ? (
        <ErrorBox message={error} onRetry={() => reload("?refresh=1")} />
      ) : !data || !k ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="MRR" value={euros(k.mrr)} hint="Revenu mensuel récurrent" />
            <StatTile label="Abonnés" value={k.activeSubscriptions} hint={`${k.trialing} en essai`} />
            <StatTile label="Encaissé 30 j" value={euros(k.revenue30d)} hint={`${euros(k.revenue12m)} sur 12 mois`} />
            <StatTile
              label="Impayés"
              value={k.pastDue}
              tone={k.pastDue > 0 ? "warning" : undefined}
              hint="Relances Stripe en cours"
            />
            <StatTile label="Remboursé 12 mois" value={euros(k.refunded12m)} hint={`${k.churned30d} fin${k.churned30d > 1 ? "s" : ""} d'abonnement (30 j)`} />
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Client, email, numéro de facture…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs defaultValue="subscriptions">
            <TabsList>
              <TabsTrigger value="subscriptions">Abonnements ({data.subscriptions.length})</TabsTrigger>
              <TabsTrigger value="invoices">Factures ({data.invoices.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="subscriptions" className="mt-4 space-y-4">
              <FilterChips
                options={SUB_FILTERS.map((f) => ({ key: f.key, label: f.label, count: data.subscriptions.filter(f.match).length }))}
                value={subFilter}
                onChange={setSubFilter}
              />
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        <Th>Client</Th>
                        <Th>Offre</Th>
                        <Th className="text-right">Montant</Th>
                        <Th>Statut</Th>
                        <Th>Échéance</Th>
                        <Th>Depuis</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((s) => (
                        <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <Td>
                            <Customer userId={s.userId} name={s.customerName} email={s.customerEmail} fallback={s.customerId} />
                          </Td>
                          <Td>
                            {s.offerName ?? "—"}
                            {s.discount && <div className="text-xs text-muted-foreground">{s.discount}</div>}
                          </Td>
                          <Td className="whitespace-nowrap text-right tabular-nums">
                            {euros(s.amount, s.currency)} <span className="text-xs text-muted-foreground">{intervalLabel(s.interval, s.intervalCount)}</span>
                          </Td>
                          <Td>
                            <SubscriptionBadge status={s.status} canceling={s.cancelAtPeriodEnd} />
                          </Td>
                          <Td className="whitespace-nowrap text-muted-foreground">
                            {s.endedAt ? `Fini le ${shortDate(s.endedAt)}` : shortDate(s.currentPeriodEnd)}
                          </Td>
                          <Td className="whitespace-nowrap text-muted-foreground">{shortDate(s.createdAt)}</Td>
                          <Td className="text-right">
                            {s.userId && (
                              <Button variant="ghost" size="xs" asChild>
                                <Link href={`/admin/users/${s.userId}`}>Gérer</Link>
                              </Button>
                            )}
                          </Td>
                        </tr>
                      ))}
                      {subscriptions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-muted-foreground">
                            Aucun abonnement
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        <Th>Date</Th>
                        <Th>Client</Th>
                        <Th>Offre</Th>
                        <Th>Motif</Th>
                        <Th className="text-right">Montant</Th>
                        <Th>Statut</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <Td className="whitespace-nowrap text-muted-foreground">{dateTime(inv.createdAt)}</Td>
                          <Td>
                            <Customer
                              userId={inv.subscriptionId ? (userBySubscription.get(inv.subscriptionId) ?? null) : null}
                              name={inv.customerName}
                              email={inv.customerEmail}
                              fallback={inv.customerId}
                            />
                          </Td>
                          <Td>{inv.offerName ?? "—"}</Td>
                          <Td className="text-muted-foreground">
                            {inv.billingReason === "subscription_create"
                              ? "1er paiement"
                              : inv.billingReason === "subscription_cycle"
                                ? "Renouvellement"
                                : inv.billingReason === "subscription_update"
                                  ? "Changement d'offre"
                                  : "—"}
                          </Td>
                          <Td className="whitespace-nowrap text-right tabular-nums">
                            {euros(inv.amountPaid || inv.amountDue, inv.currency, true)}
                            {inv.amountRefunded > 0 && (
                              <div className="text-xs text-muted-foreground">−{euros(inv.amountRefunded, inv.currency, true)}</div>
                            )}
                          </Td>
                          <Td>
                            <InvoiceBadge status={inv.status} refunded={inv.amountRefunded} paid={inv.amountPaid} />
                          </Td>
                          <Td className="whitespace-nowrap text-right">
                            {inv.hostedUrl && (
                              <Button variant="ghost" size="icon-sm" asChild title="Voir la facture">
                                <a href={inv.hostedUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {inv.pdfUrl && (
                              <Button variant="ghost" size="icon-sm" asChild title="PDF">
                                <a href={inv.pdfUrl} target="_blank" rel="noreferrer">
                                  <FileText className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </Td>
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-muted-foreground">
                            Aucune facture sur les 12 derniers mois
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <p className="mt-2 text-xs text-muted-foreground">
                Pour rembourser, ouvrez la fiche du client (colonne Client).
              </p>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
