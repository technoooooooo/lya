"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Infinity as InfinityIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AccessSource } from "@/types/database";

/**
 * Briques partagées du back-office : appels API, formats, badges d'état,
 * tuiles d'indicateurs et histogramme. Tout le vocabulaire affiché à Mathieu
 * (statuts Stripe traduits, provenance d'accès) vit ici, en un seul endroit.
 */

// --- Données -----------------------------------------------------------------

export async function adminFetch<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    ...(json !== undefined
      ? { body: JSON.stringify(json), headers: { "Content-Type": "application/json" } }
      : {}),
  });
  const payload = await res.json().catch(() => null);
  if (!payload?.success) throw new Error(payload?.error?.message ?? `Erreur ${res.status}`);
  return payload.data as T;
}

export function useAdminData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(url));

  const load = useCallback(
    async (suffix = "") => {
      if (!url) return;
      setIsLoading(true);
      try {
        setData(await adminFetch<T>(url + suffix));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setIsLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, isLoading, reload: load, setData };
}

// --- Formats -------------------------------------------------------------------

export function euros(cents: number, currency = "eur", precise = false) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: precise || cents % 100 !== 0 ? 2 : 0,
  }).format(cents / 100);
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** « il y a 3 j », « il y a 2 h » — pour la dernière activité. */
export function relative(value: string | null | undefined) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `il y a ${days} j`;
  const months = Math.round(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.round(months / 12)} an${months >= 24 ? "s" : ""}`;
}

export function fullName(u: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Sans nom";
}

export function intervalLabel(interval: string | null, count = 1) {
  const units: Record<string, string> = { day: "jour", week: "semaine", month: "mois", year: "an" };
  if (!interval) return "";
  return count === 1 ? `/ ${units[interval] ?? interval}` : `/ ${count} ${units[interval] ?? interval}`;
}

// --- Badges --------------------------------------------------------------------

type Tone = "good" | "warning" | "critical" | "neutral" | "info";

const TONES: Record<Tone, string> = {
  good: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
  warning: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  critical: "bg-red-500/12 text-red-700 dark:text-red-300 ring-red-500/25",
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-sky-500/25",
};

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export type AccessState = "lifetime" | "active" | "past_due" | "expired" | "none";

export const ACCESS_STATE_LABEL: Record<AccessState, string> = {
  lifetime: "À vie",
  active: "Actif",
  past_due: "Impayé",
  expired: "Expiré",
  none: "Sans accès",
};

export function AccessBadge({ state }: { state: AccessState }) {
  const tone: Tone =
    state === "active" || state === "lifetime" ? "good" : state === "past_due" ? "warning" : "neutral";
  return (
    <Pill tone={tone}>
      {state === "lifetime" && <InfinityIcon className="h-3 w-3" />}
      {state === "past_due" && <AlertTriangle className="h-3 w-3" />}
      {ACCESS_STATE_LABEL[state]}
    </Pill>
  );
}

export const SOURCE_LABEL: Record<AccessSource, string> = {
  stripe_subscription: "Abonnement",
  stripe_payment: "Paiement unique",
  academy: "Académie",
  manual: "Offert",
  promo: "Code d'accès",
};

const SUB_STATUS: Record<string, [string, Tone]> = {
  active: ["Actif", "good"],
  trialing: ["Essai", "info"],
  past_due: ["Impayé", "warning"],
  unpaid: ["Impayé", "critical"],
  canceled: ["Résilié", "neutral"],
  incomplete: ["Incomplet", "warning"],
  incomplete_expired: ["Expiré", "neutral"],
  paused: ["En pause", "neutral"],
};

export function SubscriptionBadge({ status, canceling }: { status: string; canceling?: boolean }) {
  const [label, tone] = SUB_STATUS[status] ?? [status, "neutral" as Tone];
  if (canceling && (status === "active" || status === "trialing")) {
    return <Pill tone="warning">Résiliation programmée</Pill>;
  }
  return <Pill tone={tone}>{label}</Pill>;
}

const INVOICE_STATUS: Record<string, [string, Tone]> = {
  paid: ["Payée", "good"],
  open: ["En attente", "warning"],
  draft: ["Brouillon", "neutral"],
  void: ["Annulée", "neutral"],
  uncollectible: ["Irrécouvrable", "critical"],
};

export function InvoiceBadge({ status, refunded, paid }: { status: string | null; refunded: number; paid: number }) {
  if (refunded > 0) {
    return <Pill tone="info">{refunded >= paid ? "Remboursée" : "Remb. partiel"}</Pill>;
  }
  const [label, tone] = INVOICE_STATUS[status ?? ""] ?? [status ?? "—", "neutral" as Tone];
  return <Pill tone={tone}>{label}</Pill>;
}

// --- Mise en page --------------------------------------------------------------

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "warning";
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums",
          tone === "warning" && "text-amber-600 dark:text-amber-400"
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="text-destructive">{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-1 font-medium underline">
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function NativeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30",
        className
      )}
      {...props}
    />
  );
}

/** Onglets-filtres en ligne avec compteur. */
export function FilterChips<K extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: K; label: string; count?: number }>;
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === o.key
              ? "border-golf bg-golf text-golf-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="tabular-nums opacity-75">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// --- Confirmation ----------------------------------------------------------------

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- Histogramme -------------------------------------------------------------------

/**
 * Histogramme à une série (inscriptions par jour, encaissements par mois).
 * Une seule série : pas de légende, le titre de la carte la nomme. Barres
 * fines à sommet arrondi, écart de 2 px, info-bulle au survol sur toute la
 * hauteur de la colonne (cible plus large que la barre).
 */
export function BarChart({
  data,
  format,
  label,
  height = 160,
}: {
  data: Array<{ key: string; value: number; tooltip?: string }>;
  format: (value: number) => string;
  label: (key: string) => string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const active = hover !== null ? data[hover] : null;
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <div>
      <div className="mb-2 h-5 text-sm">
        {active ? (
          <span>
            <span className="font-semibold tabular-nums">{format(active.value)}</span>{" "}
            <span className="text-muted-foreground">· {active.tooltip ?? label(active.key)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Survolez une barre pour le détail</span>
        )}
      </div>
      <div
        className="relative flex items-end gap-[2px] border-b border-border"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={data.map((d) => `${label(d.key)} : ${format(d.value)}`).join(", ")}
      >
        {/* Repère du maximum, discret */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border/70" />
        <span className="pointer-events-none absolute -top-2 right-0 translate-y-[-100%] text-[10px] text-muted-foreground tabular-nums">
          {format(max)}
        </span>
        {data.map((d, i) => (
          <div
            key={d.key}
            className="flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(i)}
          >
            <div
              className={cn(
                "w-full rounded-t-[4px] transition-colors",
                hover === i ? "bg-golf" : "bg-golf/70",
                d.value === 0 && "bg-border"
              )}
              style={{ height: d.value === 0 ? 2 : `${Math.max(3, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[10px] text-muted-foreground">
        {data.map((d, i) => (
          <div key={d.key} className="flex-1 truncate text-center">
            {i % labelEvery === 0 || i === data.length - 1 ? label(d.key) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
