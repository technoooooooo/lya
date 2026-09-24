"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Gift, Loader2, Plus, Shuffle, Ticket } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ConfirmDialog,
  ErrorBox,
  Loading,
  NativeSelect,
  PageHeader,
  Pill,
  Td,
  Th,
  adminFetch,
  shortDate,
  useAdminData,
} from "@/components/admin/kit";
import type { AdminPromotionCode } from "@/lib/stripe/admin";

interface AccessCode {
  id: string;
  code: string;
  label: string | null;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  access_days: number | null;
  created_at: string;
  redemptions: Array<{ user_id: string; name: string | null; created_at: string; ends_at: string | null; revoked_at: string | null }>;
}

/** Code lisible, sans caractères ambigus (0/O, 1/I). */
function randomCode(prefix = "TGA") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${prefix}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold tracking-wide hover:bg-muted/70"
      title="Copier"
    >
      {code}
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-60" />}
    </button>
  );
}

function codeState(c: { active: boolean; expiresAt: string | null; max: number | null; used: number }) {
  if (!c.active) return <Pill tone="neutral">Désactivé</Pill>;
  if (c.expiresAt && new Date(c.expiresAt) <= new Date()) return <Pill tone="neutral">Expiré</Pill>;
  if (c.max !== null && c.used >= c.max) return <Pill tone="neutral">Épuisé</Pill>;
  return <Pill tone="good">Actif</Pill>;
}

export default function AdminPromoCodesPage() {
  const stripe = useAdminData<{ codes: AdminPromotionCode[]; dashboardUrl: string }>("/api/admin/promo-codes");
  const access = useAdminData<AccessCode[]>("/api/admin/access-codes");
  const [createStripe, setCreateStripe] = useState(false);
  const [createAccess, setCreateAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AccessCode | null>(null);

  const toggleStripe = async (code: AdminPromotionCode) => {
    setError(null);
    try {
      const updated = await adminFetch<AdminPromotionCode>(`/api/admin/promo-codes/${code.id}`, {
        method: "PATCH",
        json: { active: !code.active },
      });
      stripe.setData((prev) => prev && { ...prev, codes: prev.codes.map((c) => (c.id === code.id ? updated : c)) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    }
  };

  const toggleAccess = async (code: AccessCode) => {
    setError(null);
    try {
      await adminFetch(`/api/admin/access-codes/${code.id}`, { method: "PATCH", json: { is_active: !code.is_active } });
      access.setData((prev) => prev && prev.map((c) => (c.id === code.id ? { ...c, is_active: !c.is_active } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-8">
      <PageHeader
        icon={Ticket}
        title="Codes promo"
        description="Réductions appliquées au paiement Stripe, et codes d'accès gratuits saisis à l'inscription."
      />

      {error && (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      )}

      <Tabs defaultValue="stripe">
        <TabsList>
          <TabsTrigger value="stripe">Réductions Stripe</TabsTrigger>
          <TabsTrigger value="access">Codes d&apos;accès gratuits</TabsTrigger>
        </TabsList>

        {/* --- Stripe --------------------------------------------------- */}
        <TabsContent value="stripe" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Codes de réduction</CardTitle>
                <CardDescription>
                  Saisis par le client sur la page de paiement. Valables uniquement sur les offres TGA — jamais sur les
                  formations systeme.io.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {stripe.data && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={stripe.data.dashboardUrl} target="_blank" rel="noreferrer">
                      Stripe <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                <Button size="sm" className="bg-golf text-golf-foreground hover:bg-golf/90" onClick={() => setCreateStripe(true)}>
                  <Plus className="h-4 w-4" /> Nouveau code
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {stripe.error ? (
                <div className="p-6">
                  <ErrorBox message={stripe.error} onRetry={() => stripe.reload()} />
                </div>
              ) : !stripe.data ? (
                <Loading />
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-y bg-muted/30">
                    <tr>
                      <Th>Code</Th>
                      <Th>Réduction</Th>
                      <Th>Durée</Th>
                      <Th className="text-right">Utilisations</Th>
                      <Th>Expire le</Th>
                      <Th>État</Th>
                      <Th className="text-right">Actif</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stripe.data.codes.map((c) => (
                      <tr key={c.id} className="border-b last:border-b-0">
                        <Td>
                          <CopyCode code={c.code} />
                          {c.couponName && c.couponName !== c.code && (
                            <div className="mt-1 text-xs text-muted-foreground">{c.couponName}</div>
                          )}
                        </Td>
                        <Td className="font-medium">{c.discountLabel}</Td>
                        <Td className="text-muted-foreground">
                          {c.durationLabel}
                          {c.firstTimeOnly && <div className="text-xs">1re commande uniquement</div>}
                        </Td>
                        <Td className="text-right tabular-nums">
                          {c.timesRedeemed}
                          {c.maxRedemptions !== null && <span className="text-muted-foreground"> / {c.maxRedemptions}</span>}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">{shortDate(c.expiresAt)}</Td>
                        <Td>{codeState({ active: c.active, expiresAt: c.expiresAt, max: c.maxRedemptions, used: c.timesRedeemed })}</Td>
                        <Td className="text-right">
                          <Switch checked={c.active} onCheckedChange={() => toggleStripe(c)} />
                        </Td>
                      </tr>
                    ))}
                    {stripe.data.codes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-muted-foreground">
                          Aucun code de réduction pour l&apos;instant
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Codes d'accès ---------------------------------------------- */}
        <TabsContent value="access" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Codes d&apos;accès gratuits</CardTitle>
                <CardDescription>
                  Saisis à l&apos;inscription (« J&apos;ai un code d&apos;accès »), ils ouvrent l&apos;accès sans paiement :
                  élèves de stage, partenaires, invités.
                </CardDescription>
              </div>
              <Button size="sm" className="bg-golf text-golf-foreground hover:bg-golf/90" onClick={() => setCreateAccess(true)}>
                <Plus className="h-4 w-4" /> Nouveau code
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {access.error ? (
                <div className="p-6">
                  <ErrorBox message={access.error} onRetry={() => access.reload()} />
                </div>
              ) : !access.data ? (
                <Loading />
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-y bg-muted/30">
                    <tr>
                      <Th>Code</Th>
                      <Th>Accès donné</Th>
                      <Th className="text-right">Utilisations</Th>
                      <Th>Utilisé par</Th>
                      <Th>Expire le</Th>
                      <Th>État</Th>
                      <Th className="text-right">Actif</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {access.data.map((c) => (
                      <tr key={c.id} className="border-b last:border-b-0 align-top">
                        <Td>
                          <CopyCode code={c.code} />
                          {c.label && <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>}
                        </Td>
                        <Td>{c.access_days ? `${c.access_days} jours` : "Sans limite"}</Td>
                        <Td className="text-right tabular-nums">
                          {c.current_uses}
                          {c.max_uses !== null && <span className="text-muted-foreground"> / {c.max_uses}</span>}
                        </Td>
                        <Td className="max-w-64">
                          {c.redemptions.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {c.redemptions.slice(0, 6).map((r) => (
                                <Link
                                  key={r.user_id}
                                  href={`/admin/users/${r.user_id}`}
                                  className="rounded bg-muted px-1.5 py-0.5 text-xs hover:underline"
                                >
                                  {r.name ?? r.user_id.slice(0, 6)}
                                </Link>
                              ))}
                              {c.redemptions.length > 6 && (
                                <span className="text-xs text-muted-foreground">+{c.redemptions.length - 6}</span>
                              )}
                            </div>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">{shortDate(c.expires_at)}</Td>
                        <Td>
                          {codeState({ active: c.is_active, expiresAt: c.expires_at, max: c.max_uses, used: c.current_uses })}
                        </Td>
                        <Td className="whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {c.current_uses === 0 && (
                              <Button variant="ghost" size="xs" onClick={() => setToDelete(c)}>
                                Supprimer
                              </Button>
                            )}
                            <Switch checked={c.is_active} onCheckedChange={() => toggleAccess(c)} />
                          </div>
                        </Td>
                      </tr>
                    ))}
                    {access.data.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-muted-foreground">
                          Aucun code d&apos;accès
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <p className="mt-2 text-xs text-muted-foreground">
            Pour offrir un accès à une personne précise sans code, ouvrez sa fiche dans Utilisateurs → « Offrir un accès ».
          </p>
        </TabsContent>
      </Tabs>

      <StripeCodeDialog
        open={createStripe}
        onOpenChange={setCreateStripe}
        onCreated={(code) => stripe.setData((prev) => prev && { ...prev, codes: [code, ...prev.codes] })}
      />
      <AccessCodeDialog open={createAccess} onOpenChange={setCreateAccess} onCreated={() => access.reload()} />

      {toDelete && (
        <ConfirmDialog
          open
          title={`Supprimer le code ${toDelete.code} ?`}
          description="Ce code n'a jamais été utilisé. Il sera définitivement supprimé."
          confirmLabel="Supprimer"
          destructive
          onOpenChange={(open) => !open && setToDelete(null)}
          onConfirm={async () => {
            const target = toDelete;
            setToDelete(null);
            try {
              await adminFetch(`/api/admin/access-codes/${target.id}`, { method: "DELETE" });
              access.setData((prev) => prev && prev.filter((c) => c.id !== target.id));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Suppression impossible");
            }
          }}
        />
      )}
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>;
}

function CodeField({ value, onChange, prefix }: { value: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="code">Code</Label>
      <div className="flex gap-2">
        <Input
          id="code"
          required
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s/g, ""))}
          className="font-mono uppercase"
          placeholder="BIENVENUE20"
        />
        <Button type="button" variant="outline" size="icon" onClick={() => onChange(randomCode(prefix))} title="Générer">
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StripeCodeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (code: AdminPromotionCode) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("20");
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">("once");
  const [months, setMonths] = useState("3");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [firstTimeOnly, setFirstTimeOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const amount = parseFloat(value.replace(",", "."));
    try {
      const created = await adminFetch<AdminPromotionCode>("/api/admin/promo-codes", {
        method: "POST",
        json: {
          code,
          name: name || undefined,
          discountType,
          percentOff: discountType === "percent" ? amount : undefined,
          amountOffCents: discountType === "amount" ? Math.round(amount * 100) : undefined,
          duration,
          durationInMonths: duration === "repeating" ? parseInt(months, 10) : undefined,
          maxRedemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : undefined,
          expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined,
          firstTimeOnly,
        },
      });
      onCreated(created);
      onOpenChange(false);
      setCode("");
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" /> Nouveau code de réduction
          </DialogTitle>
          <DialogDescription>Créé directement dans Stripe, utilisable tout de suite sur la page de paiement.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <CodeField value={code} onChange={setCode} prefix="TGA" />
          <div className="grid gap-2">
            <Label htmlFor="name">Nom interne (optionnel)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Opération rentrée 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Réduction</Label>
              <NativeSelect value={discountType} onChange={(e) => setDiscountType(e.target.value as "percent" | "amount")}>
                <option value="percent">Pourcentage</option>
                <option value="amount">Montant fixe</option>
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="value">{discountType === "percent" ? "Pourcentage (%)" : "Montant (€)"}</Label>
              <Input id="value" required inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>S&apos;applique</Label>
              <NativeSelect value={duration} onChange={(e) => setDuration(e.target.value as typeof duration)}>
                <option value="once">Au 1er paiement</option>
                <option value="repeating">Pendant plusieurs mois</option>
                <option value="forever">À chaque paiement</option>
              </NativeSelect>
            </div>
            {duration === "repeating" && (
              <div className="grid gap-2">
                <Label htmlFor="months">Nombre de mois</Label>
                <Input id="months" required inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="max">Utilisations max.</Label>
              <Input id="max" inputMode="numeric" placeholder="Illimité" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expires">Expire le</Label>
              <Input
                id="expires"
                type="date"
                min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={firstTimeOnly} onCheckedChange={(v) => setFirstTimeOnly(v === true)} />
            Réservé aux nouveaux clients (1re commande)
          </label>
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={busy} className="bg-golf text-golf-foreground hover:bg-golf/90">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccessCodeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/access-codes", {
        method: "POST",
        json: {
          code,
          label: label || undefined,
          accessDays: days ? parseInt(days, 10) : null,
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
          expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
        },
      });
      onCreated();
      onOpenChange(false);
      setCode("");
      setLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" /> Nouveau code d&apos;accès
          </DialogTitle>
          <DialogDescription>À transmettre à vos élèves : ils le saisissent à l&apos;inscription, sans payer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <CodeField value={code} onChange={setCode} prefix="STAGE" />
          <div className="grid gap-2">
            <Label htmlFor="label">Libellé (optionnel)</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Stage Marrakech octobre" />
          </div>
          <div className="grid gap-2">
            <Label>Durée de l&apos;accès</Label>
            <div className="flex flex-wrap gap-2">
              {[
                ["", "Sans limite"],
                ["30", "1 mois"],
                ["90", "3 mois"],
                ["180", "6 mois"],
                ["365", "1 an"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDays(v)}
                  className={
                    days === v
                      ? "rounded-lg border border-golf bg-golf/10 px-3 py-1.5 text-sm font-medium"
                      : "rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                  }
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="max-uses">Utilisations max.</Label>
              <Input id="max-uses" inputMode="numeric" placeholder="Illimité" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code-expires">Code valable jusqu&apos;au</Label>
              <Input
                id="code-expires"
                type="date"
                min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={busy} className="bg-golf text-golf-foreground hover:bg-golf/90">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
