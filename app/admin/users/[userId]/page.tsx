"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Gift,
  KeyRound,
  Loader2,
  MessageSquare,
  Pencil,
  ShieldCheck,
  UserX,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AccessBadge,
  ConfirmDialog,
  ErrorBox,
  InvoiceBadge,
  Loading,
  NativeSelect,
  Pill,
  SOURCE_LABEL,
  SubscriptionBadge,
  Td,
  Th,
  adminFetch,
  dateTime,
  euros,
  fullName,
  intervalLabel,
  relative,
  shortDate,
  useAdminData,
} from "@/components/admin/kit";
import type { AdminUserRow } from "@/lib/admin/users";
import type { CustomerBilling, AdminInvoice, AdminSubscription } from "@/lib/stripe/admin";
import type { AccessGrant } from "@/types/database";

interface Detail {
  user: AdminUserRow;
  grants: Array<AccessGrant & { offer_name: string | null }>;
  billing: CustomerBilling;
  billingError: string | null;
  livemode: boolean;
}

interface Stats {
  totalConversations: number;
  totalMessages: number;
  breakdown: Array<{ pillarId: string | null; pillarName: string; count: number; percentage: number }>;
}

type Confirm = {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<unknown>;
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const detail = useAdminData<Detail>(`/api/admin/users/${userId}`);
  const stats = useAdminData<Stats>(`/api/admin/users/${userId}/stats`);

  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [refundTarget, setRefundTarget] = useState<AdminInvoice | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      setNotice({ tone: "ok", text: success });
      await detail.reload();
      return true;
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Action impossible" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (detail.error) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <BackLink />
        <ErrorBox message={detail.error} onRetry={() => detail.reload()} />
      </div>
    );
  }
  if (!detail.data) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <BackLink />
        <Loading />
      </div>
    );
  }

  const { user, grants, billing, billingError } = detail.data;
  const patchUser = (body: Record<string, unknown>) =>
    adminFetch(`/api/admin/users/${userId}`, { method: "PATCH", json: body });

  const subscriptionAction = (s: AdminSubscription, action: "cancel_at_period_end" | "resume" | "cancel_now") =>
    adminFetch(`/api/admin/stripe/subscriptions/${s.id}`, { method: "POST", json: { action } });

  return (
    <div className="mx-auto max-w-6xl p-8">
      <BackLink />

      {/* En-tête */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-golf text-lg font-semibold text-golf-foreground">
              {fullName(user).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{fullName(user)}</h2>
              <AccessBadge state={user.access.state} />
              {user.role === "admin" && (
                <Pill tone="info">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </Pill>
              )}
              {!user.isActive && <Pill tone="critical">Compte désactivé</Pill>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              <span>{user.email ?? "—"}</span>
              {user.golfClub && <span>· {user.golfClub}</span>}
              <span>· inscrit le {shortDate(user.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !user.email}
            onClick={() =>
              setConfirm({
                title: "Envoyer un lien de réinitialisation ?",
                description: `Un email « mot de passe oublié » sera envoyé à ${user.email}.`,
                confirmLabel: "Envoyer",
                run: () =>
                  run(
                    () => adminFetch(`/api/admin/users/${userId}/password-reset`, { method: "POST" }),
                    `Email de réinitialisation envoyé à ${user.email}.`
                  ),
              })
            }
          >
            <KeyRound className="h-4 w-4" /> Mot de passe
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              setConfirm(
                user.isActive
                  ? {
                      title: "Désactiver ce compte ?",
                      description:
                        "L'utilisateur ne pourra plus utiliser le chat, même avec un abonnement payé. Stripe continue de facturer : résiliez l'abonnement si nécessaire.",
                      confirmLabel: "Désactiver",
                      destructive: true,
                      run: () => run(() => patchUser({ is_active: false }), "Compte désactivé."),
                    }
                  : {
                      title: "Réactiver ce compte ?",
                      description: "L'utilisateur retrouve l'accès correspondant à ses droits en cours.",
                      confirmLabel: "Réactiver",
                      run: () => run(() => patchUser({ is_active: true }), "Compte réactivé."),
                    }
              )
            }
          >
            {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            {user.isActive ? "Désactiver" : "Réactiver"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              setConfirm({
                title: user.role === "admin" ? "Retirer les droits admin ?" : "Donner les droits admin ?",
                description:
                  user.role === "admin"
                    ? "Ce compte n'aura plus accès au back-office."
                    : "Ce compte aura accès à tout le back-office : utilisateurs, paiements, configuration de l'IA.",
                confirmLabel: user.role === "admin" ? "Retirer" : "Donner les droits",
                destructive: user.role !== "admin",
                run: () =>
                  run(
                    () => patchUser({ role: user.role === "admin" ? "user" : "admin" }),
                    user.role === "admin" ? "Droits admin retirés." : "Droits admin accordés."
                  ),
              })
            }
          >
            <ShieldCheck className="h-4 w-4" />
            {user.role === "admin" ? "Retirer admin" : "Passer admin"}
          </Button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={
            notice.tone === "ok"
              ? "mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200"
              : "mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          }
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Accès */}
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Accès</CardTitle>
                <CardDescription>
                  {user.access.state === "lifetime"
                    ? "Accès sans date de fin"
                    : user.access.until
                      ? `${user.access.state === "expired" ? "Terminé le" : "Jusqu'au"} ${shortDate(user.access.until)}`
                      : "Aucun accès en cours"}
                  {user.access.source && ` · ${SOURCE_LABEL[user.access.source]}`}
                </CardDescription>
              </div>
              <Button size="sm" className="bg-golf text-golf-foreground hover:bg-golf/90" onClick={() => setGrantOpen(true)}>
                <Gift className="h-4 w-4" /> Offrir un accès
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {grants.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">Aucun droit d&apos;accès enregistré.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-y bg-muted/30">
                    <tr>
                      <Th>Provenance</Th>
                      <Th>Début</Th>
                      <Th>Fin</Th>
                      <Th>Note</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {grants.map((g) => {
                      const ended = g.ends_at && new Date(g.ends_at) <= new Date();
                      return (
                        <tr key={g.id} className={g.revoked_at ? "border-b text-muted-foreground line-through decoration-muted-foreground/50" : "border-b"}>
                          <Td>
                            <div className="font-medium no-underline">{SOURCE_LABEL[g.source]}</div>
                            {g.offer_name && <div className="text-xs text-muted-foreground">{g.offer_name}</div>}
                          </Td>
                          <Td className="whitespace-nowrap">{shortDate(g.starts_at)}</Td>
                          <Td className="whitespace-nowrap">
                            {g.ends_at ? shortDate(g.ends_at) : "Sans terme"}
                            {g.payment_state === "past_due" && <Pill tone="warning" className="ml-2">Impayé</Pill>}
                            {ended && !g.revoked_at && <span className="ml-1 text-xs text-muted-foreground">(terminé)</span>}
                          </Td>
                          <Td className="max-w-56 truncate text-xs text-muted-foreground">{g.note ?? "—"}</Td>
                          <Td className="text-right">
                            {!g.source.startsWith("stripe_") && (
                              <Button
                                variant="ghost"
                                size="xs"
                                disabled={busy}
                                onClick={() =>
                                  setConfirm(
                                    g.revoked_at
                                      ? {
                                          title: "Rétablir cet accès ?",
                                          description: "L'accès redevient valable jusqu'à sa date de fin d'origine.",
                                          confirmLabel: "Rétablir",
                                          run: () =>
                                            run(
                                              () => adminFetch(`/api/admin/users/${userId}/grants/${g.id}`, { method: "PATCH", json: { action: "restore" } }),
                                              "Accès rétabli."
                                            ),
                                        }
                                      : {
                                          title: "Révoquer cet accès ?",
                                          description: "L'accès est coupé immédiatement. Il reste visible dans l'historique et peut être rétabli.",
                                          confirmLabel: "Révoquer",
                                          destructive: true,
                                          run: () =>
                                            run(
                                              () => adminFetch(`/api/admin/users/${userId}/grants/${g.id}`, { method: "PATCH", json: { action: "revoke" } }),
                                              "Accès révoqué."
                                            ),
                                        }
                                  )
                                }
                              >
                                {g.revoked_at ? "Rétablir" : "Révoquer"}
                              </Button>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Stripe */}
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Facturation Stripe</CardTitle>
                <CardDescription>
                  {billing.customer ? `Client ${billing.customer.id}` : "Aucun client Stripe rattaché"}
                </CardDescription>
              </div>
              {billing.customer && (
                <Button variant="outline" size="sm" asChild>
                  <a href={billing.customer.dashboardUrl} target="_blank" rel="noreferrer">
                    Ouvrir dans Stripe <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {billingError && <ErrorBox message={`Stripe : ${billingError}`} />}

              {billing.subscriptions.length === 0 && !billingError && (
                <p className="text-sm text-muted-foreground">Aucun abonnement.</p>
              )}
              {billing.subscriptions.map((s) => (
                <div key={s.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.offerName ?? s.priceId}</span>
                        <SubscriptionBadge status={s.status} canceling={s.cancelAtPeriodEnd} />
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {euros(s.amount, s.currency)} {intervalLabel(s.interval, s.intervalCount)} · depuis le {shortDate(s.createdAt)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {s.endedAt
                          ? `Terminé le ${shortDate(s.endedAt)}`
                          : s.cancelAtPeriodEnd
                            ? `Se termine le ${shortDate(s.currentPeriodEnd)}`
                            : `Prochain renouvellement le ${shortDate(s.currentPeriodEnd)}`}
                        {s.trialEnd && new Date(s.trialEnd) > new Date() && ` · essai jusqu'au ${shortDate(s.trialEnd)}`}
                      </div>
                      {s.discount && <div className="mt-1 text-xs text-muted-foreground">Remise : {s.discount}</div>}
                    </div>
                    {!s.endedAt && s.status !== "canceled" && (
                      <div className="flex flex-wrap gap-2">
                        {s.cancelAtPeriodEnd ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              setConfirm({
                                title: "Réactiver l'abonnement ?",
                                description: `La résiliation programmée est annulée : l'abonnement sera renouvelé le ${shortDate(s.currentPeriodEnd)}.`,
                                confirmLabel: "Réactiver",
                                run: () => run(() => subscriptionAction(s, "resume"), "Abonnement réactivé."),
                              })
                            }
                          >
                            Réactiver
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              setConfirm({
                                title: "Résilier à échéance ?",
                                description: `Aucun nouveau prélèvement. L'accès reste ouvert jusqu'au ${shortDate(s.currentPeriodEnd)}, fin de la période payée.`,
                                confirmLabel: "Résilier à échéance",
                                run: () => run(() => subscriptionAction(s, "cancel_at_period_end"), "Résiliation programmée."),
                              })
                            }
                          >
                            Résilier à échéance
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({
                              title: "Résilier immédiatement ?",
                              description:
                                "L'abonnement s'arrête tout de suite dans Stripe, sans remboursement automatique. L'accès déjà payé reste ouvert jusqu'à la fin de la période, sauf en cas d'impayé. Pour couper aussi l'accès, désactivez le compte.",
                              confirmLabel: "Résilier maintenant",
                              destructive: true,
                              run: () => run(() => subscriptionAction(s, "cancel_now"), "Abonnement résilié."),
                            })
                          }
                        >
                          Résilier maintenant
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {billing.invoices.length > 0 && (
                <div className="-mx-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-y bg-muted/30">
                      <tr>
                        <Th>Date</Th>
                        <Th>Facture</Th>
                        <Th className="text-right">Montant</Th>
                        <Th>Statut</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {billing.invoices.map((inv) => (
                        <tr key={inv.id} className="border-b last:border-b-0">
                          <Td className="whitespace-nowrap">{shortDate(inv.createdAt)}</Td>
                          <Td className="text-muted-foreground">{inv.number ?? inv.id}</Td>
                          <Td className="text-right tabular-nums">
                            {euros(inv.amountPaid || inv.amountDue, inv.currency, true)}
                            {inv.amountRefunded > 0 && (
                              <div className="text-xs text-muted-foreground">−{euros(inv.amountRefunded, inv.currency, true)} remb.</div>
                            )}
                          </Td>
                          <Td>
                            <InvoiceBadge status={inv.status} refunded={inv.amountRefunded} paid={inv.amountPaid} />
                          </Td>
                          <Td className="whitespace-nowrap text-right">
                            {inv.pdfUrl && (
                              <Button variant="ghost" size="icon-sm" asChild title="Télécharger le PDF">
                                <a href={inv.pdfUrl} target="_blank" rel="noreferrer">
                                  <FileText className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {inv.status === "paid" && inv.amountPaid > inv.amountRefunded && inv.chargeId && (
                              <Button variant="ghost" size="xs" disabled={busy} onClick={() => setRefundTarget(inv)}>
                                Rembourser
                              </Button>
                            )}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Inscription" value={dateTime(user.createdAt)} />
              <Row label="Dernière connexion" value={user.lastSignInAt ? relative(user.lastSignInAt) : "Jamais"} />
              <Row label="Email confirmé" value={user.emailConfirmed ? "Oui" : "Non"} />
              <Row label="Golf" value={user.golfClub ?? "—"} />
              <Row
                label="Identifiant"
                value={
                  <button
                    type="button"
                    className="font-mono text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => navigator.clipboard.writeText(user.userId)}
                    title="Copier"
                  >
                    {user.userId.slice(0, 8)}…
                  </button>
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" /> Activité
              </CardTitle>
              <CardDescription>
                Dernier message : {relative(user.activity?.lastMessageAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.isLoading && !stats.data ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              ) : stats.data ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg border p-3">
                      <div className="text-xl font-semibold tabular-nums">{stats.data.totalConversations}</div>
                      <div className="text-xs text-muted-foreground">Conversations</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xl font-semibold tabular-nums">{stats.data.totalMessages}</div>
                      <div className="text-xs text-muted-foreground">Messages</div>
                    </div>
                  </div>
                  {stats.data.breakdown.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Conversations par pilier</div>
                      {stats.data.breakdown.map((b) => (
                        <div key={b.pillarName} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{b.pillarName}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {b.count} · {b.percentage} %
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-golf" style={{ width: `${b.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Statistiques indisponibles.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          open
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          destructive={confirm.destructive}
          onOpenChange={(open) => !open && setConfirm(null)}
          onConfirm={() => {
            const action = confirm.run;
            setConfirm(null);
            action();
          }}
        />
      )}

      <GrantDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        onSubmit={(body) =>
          run(() => adminFetch(`/api/admin/users/${userId}/grants`, { method: "POST", json: body }), "Accès offert.").then(
            (done) => done && setGrantOpen(false)
          )
        }
        busy={busy}
      />

      <RefundDialog
        invoice={refundTarget}
        busy={busy}
        onOpenChange={(open) => !open && setRefundTarget(null)}
        onSubmit={(amountCents) =>
          run(
            () =>
              adminFetch(`/api/admin/stripe/invoices/${refundTarget!.id}/refund`, {
                method: "POST",
                json: amountCents ? { amountCents } : {},
              }),
            "Remboursement effectué. Il apparaît sur le relevé du client sous 5 à 10 jours."
          ).then((done) => done && setRefundTarget(null))
        }
      />

      <EditDialog
        open={editOpen}
        user={user}
        busy={busy}
        onOpenChange={setEditOpen}
        onSubmit={(body) => run(() => patchUser(body), "Profil mis à jour.").then((done) => done && setEditOpen(false))}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Utilisateurs
    </Link>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

const PRESETS = [
  { key: "30", label: "1 mois", days: 30 },
  { key: "90", label: "3 mois", days: 90 },
  { key: "180", label: "6 mois", days: 180 },
  { key: "365", label: "1 an", days: 365 },
  { key: "lifetime", label: "À vie" },
  { key: "until", label: "Jusqu'à une date" },
] as const;

function GrantDialog({
  open,
  onOpenChange,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const [preset, setPreset] = useState<string>("30");
  const [until, setUntil] = useState("");
  const [note, setNote] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const choice = PRESETS.find((p) => p.key === preset)!;
    if (choice.key === "lifetime") onSubmit({ kind: "lifetime", note });
    else if (choice.key === "until") onSubmit({ kind: "until", until: new Date(`${until}T23:59:59`).toISOString(), note });
    else onSubmit({ kind: "days", days: "days" in choice ? choice.days : 30, note });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Offrir un accès</DialogTitle>
          <DialogDescription>
            S&apos;ajoute aux droits existants : l&apos;accès effectif est toujours le plus long. Aucun paiement n&apos;est demandé.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={
                  preset === p.key
                    ? "rounded-lg border border-golf bg-golf/10 px-3 py-2 text-sm font-medium"
                    : "rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "until" && (
            <div className="grid gap-2">
              <Label htmlFor="grant-until">Date de fin</Label>
              <Input
                id="grant-until"
                type="date"
                required
                min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="grant-note">Note interne</Label>
            <Input
              id="grant-note"
              placeholder="Ex. : élève du stage de Marrakech"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={busy} className="bg-golf text-golf-foreground hover:bg-golf/90">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Offrir l&apos;accès
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RefundDialog({
  invoice,
  busy,
  onOpenChange,
  onSubmit,
}: {
  invoice: AdminInvoice | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amountCents?: number) => void;
}) {
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const refundable = invoice ? invoice.amountPaid - invoice.amountRefunded : 0;

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rembourser {invoice?.number ?? "la facture"}</DialogTitle>
          <DialogDescription>
            Remboursable : {euros(refundable, invoice?.currency, true)}. Le remboursement ne résilie pas l&apos;abonnement et ne coupe pas l&apos;accès.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === "full") onSubmit();
            else onSubmit(Math.round(parseFloat(amount.replace(",", ".")) * 100));
          }}
        >
          <NativeSelect value={mode} onChange={(e) => setMode(e.target.value as "full" | "partial")} className="w-full">
            <option value="full">Remboursement total ({euros(refundable, invoice?.currency, true)})</option>
            <option value="partial">Remboursement partiel</option>
          </NativeSelect>
          {mode === "partial" && (
            <div className="grid gap-2">
              <Label htmlFor="refund-amount">Montant (€)</Label>
              <Input
                id="refund-amount"
                inputMode="decimal"
                required
                placeholder="10,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Rembourser
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  open,
  user,
  busy,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  user: AdminUserRow;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [golfClub, setGolfClub] = useState(user.golfClub ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ first_name: firstName || null, last_name: lastName || null, golf_club: golfClub || null });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-first">Prénom</Label>
              <Input id="edit-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-last">Nom</Label>
              <Input id="edit-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-golf">Golf</Label>
            <Input id="edit-golf" value={golfClub} onChange={(e) => setGolfClub(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={busy}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
