"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function AccountPage() {
  const { user, profile, isLoading } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères");
      setIsUpdating(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword("");
    } catch (error: unknown) {
      setPasswordError(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <h2 className="text-2xl font-bold">Mon compte</h2>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Abonnement</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={profile?.subscription_status === "active" ? "default" : "secondary"}>
                {profile?.subscription_status === "active" ? "Actif" : "Inactif"}
              </Badge>
              {profile?.subscription_type && (
                <span className="text-sm text-muted-foreground">
                  ({profile.subscription_type === "promo" ? "Code promo" : "Payant"})
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modifier le mot de passe</CardTitle>
          <CardDescription>
            Entrez un nouveau mot de passe pour votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            {passwordSuccess && (
              <p className="text-sm text-green-600">Mot de passe mis à jour</p>
            )}
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
