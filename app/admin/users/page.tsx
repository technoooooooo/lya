"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Loader2, Copy, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/types/database";

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success) {
        setProfiles(json.data);
      } else {
        setError(json.error?.message ?? "Erreur inconnue");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleActive = async (userId: string, currentStatus: boolean) => {
    setTogglingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setProfiles((prev) =>
          prev.map((p) =>
            p.user_id === userId ? { ...p, is_active: !currentStatus } : p
          )
        );
      }
    } catch {
      // Silently fail, user can retry
    } finally {
      setTogglingUserId(null);
    }
  };

  const truncateId = (id: string) => {
    return id.length > 8 ? `${id.slice(0, 8)}...` : id;
  };

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const filteredProfiles = profiles.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.first_name?.toLowerCase().includes(q)) ||
      (p.last_name?.toLowerCase().includes(q)) ||
      (p.golf_club?.toLowerCase().includes(q)) ||
      p.user_id.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
        <Badge variant="secondary">{profiles.length}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>
            Consultez et gérez les comptes utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, prénom, golf ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Prénom
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Nom
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Golf
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    User ID
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Abonnement
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Actif
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Inscription
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="py-3 px-4">
                      {profile.first_name || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      {profile.last_name || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {profile.golf_club || "-"}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => copyId(profile.user_id)}
                        className="inline-flex items-center gap-1.5 hover:text-foreground text-muted-foreground transition-colors cursor-pointer"
                        title={`Copier ${profile.user_id}`}
                      >
                        {truncateId(profile.user_id)}
                        {copiedId === profile.user_id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          profile.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {profile.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          profile.subscription_status === "active"
                            ? "default"
                            : "outline"
                        }
                      >
                        {profile.subscription_status === "active"
                          ? "Actif"
                          : "Inactif"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant={profile.is_active ? "default" : "outline"}
                        size="sm"
                        disabled={togglingUserId === profile.user_id}
                        onClick={() =>
                          toggleActive(profile.user_id, profile.is_active)
                        }
                      >
                        {togglingUserId === profile.user_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : profile.is_active ? (
                          "Oui"
                        ) : (
                          "Non"
                        )}
                      </Button>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {formatDate(profile.created_at)}
                    </td>
                  </tr>
                ))}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {search ? "Aucun résultat" : "Aucun utilisateur"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
