"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AccessBadge,
  ErrorBox,
  FilterChips,
  Loading,
  PageHeader,
  Pill,
  SOURCE_LABEL,
  Td,
  Th,
  fullName,
  relative,
  shortDate,
  useAdminData,
} from "@/components/admin/kit";
import type { AdminUserRow } from "@/lib/admin/users";

type Filter = "all" | "access" | "subscription" | "free" | "past_due" | "none" | "disabled" | "admin";
type Sort = "recent" | "activity" | "name";

const FILTERS: Array<{ key: Filter; label: string; match: (u: AdminUserRow) => boolean }> = [
  { key: "all", label: "Tous", match: () => true },
  { key: "access", label: "Avec accès", match: (u) => ["active", "lifetime", "past_due"].includes(u.access.state) },
  { key: "subscription", label: "Abonnés", match: (u) => u.access.source === "stripe_subscription" && u.access.state !== "expired" && u.access.state !== "none" },
  { key: "free", label: "Accès offert", match: (u) => (u.access.source === "manual" || u.access.source === "promo") && ["active", "lifetime"].includes(u.access.state) },
  { key: "past_due", label: "Impayés", match: (u) => u.access.state === "past_due" },
  { key: "none", label: "Sans accès", match: (u) => u.access.state === "none" || u.access.state === "expired" },
  { key: "disabled", label: "Désactivés", match: (u) => !u.isActive },
  { key: "admin", label: "Admins", match: (u) => u.role === "admin" },
];

function toCsv(rows: AdminUserRow[]) {
  const header = ["Prénom", "Nom", "Email", "Golf", "Rôle", "Compte actif", "Accès", "Provenance", "Accès jusqu'au", "Inscription", "Dernière connexion", "Conversations", "Messages"];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((u) =>
    [
      u.firstName,
      u.lastName,
      u.email,
      u.golfClub,
      u.role,
      u.isActive ? "oui" : "non",
      u.access.state,
      u.access.source ? SOURCE_LABEL[u.access.source] : "",
      u.access.until ? u.access.until.slice(0, 10) : u.access.state === "lifetime" ? "à vie" : "",
      u.createdAt.slice(0, 10),
      u.lastSignInAt?.slice(0, 10) ?? "",
      u.activity?.conversations ?? "",
      u.activity?.userMessages ?? "",
    ]
      .map(escape)
      .join(";")
  );
  // BOM : Excel ouvre sinon le fichier en Latin-1 et casse les accents.
  return "﻿" + [header.map(escape).join(";"), ...lines].join("\n");
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { data, error, isLoading, reload } = useAdminData<AdminUserRow[]>("/api/admin/users");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");

  const users = useMemo(() => data ?? [], [data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = FILTERS.find((f) => f.key === filter)!.match;
    const rows = users.filter(
      (u) =>
        match(u) &&
        (!q ||
          [u.firstName, u.lastName, u.email, u.golfClub, u.userId].some((v) => v?.toLowerCase().includes(q)))
    );
    return rows.sort((a, b) => {
      if (sort === "name") return fullName(a).localeCompare(fullName(b), "fr");
      if (sort === "activity") {
        return (b.activity?.lastMessageAt ?? b.lastSignInAt ?? "").localeCompare(
          a.activity?.lastMessageAt ?? a.lastSignInAt ?? ""
        );
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [users, search, filter, sort]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utilisateurs-tga-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl p-8">
      <PageHeader
        icon={Users}
        title="Utilisateurs"
        description="Comptes, accès, facturation et activité. Cliquez sur une ligne pour ouvrir la fiche."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!visible.length}>
            <Download className="h-4 w-4" />
            Exporter ({visible.length})
          </Button>
        }
      />

      {error ? (
        <ErrorBox message={error} onRetry={() => reload()} />
      ) : isLoading && !data ? (
        <Loading />
      ) : (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-64 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nom, email, golf…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Trier par
                {(["recent", "activity", "name"] as Sort[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSort(s)}
                    className={sort === s ? "font-medium text-foreground underline underline-offset-4" : "hover:text-foreground"}
                  >
                    {s === "recent" ? "inscription" : s === "activity" ? "activité" : "nom"}
                  </button>
                ))}
              </div>
            </div>

            <FilterChips
              options={FILTERS.map((f) => ({ key: f.key, label: f.label, count: users.filter(f.match).length }))}
              value={filter}
              onChange={setFilter}
            />

            <div className="-mx-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/30">
                  <tr>
                    <Th>Utilisateur</Th>
                    <Th>Accès</Th>
                    <Th>Provenance</Th>
                    <Th>Échéance</Th>
                    <Th className="text-right">Messages</Th>
                    <Th>Dernière activité</Th>
                    <Th>Inscription</Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => (
                    <tr
                      key={u.userId}
                      onClick={() => router.push(`/admin/users/${u.userId}`)}
                      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {fullName(u).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="truncate">{fullName(u)}</span>
                              {u.role === "admin" && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-golf" aria-label="Admin" />}
                              {!u.isActive && <Pill tone="critical">Désactivé</Pill>}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{u.email ?? u.userId}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <AccessBadge state={u.access.state} />
                      </Td>
                      <Td className="text-muted-foreground">{u.access.source ? SOURCE_LABEL[u.access.source] : "—"}</Td>
                      <Td className="whitespace-nowrap text-muted-foreground">
                        {u.access.state === "lifetime" ? "—" : shortDate(u.access.until)}
                      </Td>
                      <Td className="text-right tabular-nums">{u.activity?.userMessages ?? "—"}</Td>
                      <Td className="whitespace-nowrap text-muted-foreground">
                        {relative(u.activity?.lastMessageAt ?? u.lastSignInAt)}
                      </Td>
                      <Td className="whitespace-nowrap text-muted-foreground">{shortDate(u.createdAt)}</Td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        {search || filter !== "all" ? "Aucun utilisateur ne correspond" : "Aucun utilisateur"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
