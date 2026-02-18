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
import { Users, Loader2 } from "lucide-react";
import type { Profile } from "@/types/database";

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

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
            Consultez et gerez les comptes utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
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
                    Type
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
                {profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="py-3 px-4 font-mono text-xs">
                      <span title={profile.user_id}>
                        {truncateId(profile.user_id)}
                      </span>
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
                      {profile.subscription_type ?? "-"}
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
                {profiles.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Aucun utilisateur
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
