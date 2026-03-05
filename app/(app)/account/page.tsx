"use client";

import { useState } from "react";
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
import { CreditCard, ExternalLink } from "lucide-react";

export default function AccountPage() {
  const { user, profile, isLoading } = useAuth();

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Stripe portal
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingEmail(true);
    setEmailError(null);
    setEmailSuccess(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailSuccess(true);
      setNewEmail("");
    } catch (error: unknown) {
      setEmailError(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères");
      setIsUpdatingPassword(false);
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
      setIsUpdatingPassword(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.data.url;
      }
    } catch {
      // Portal not available
    } finally {
      setIsLoadingPortal(false);
    }
  };

  if (isLoading && !user) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const subscriptionLabel =
    profile?.subscription_status === "active"
      ? "Actif"
      : profile?.subscription_status === "past_due"
        ? "En retard de paiement"
        : "Inactif";

  const subscriptionVariant =
    profile?.subscription_status === "active"
      ? "default"
      : profile?.subscription_status === "past_due"
        ? "secondary"
        : "outline";

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <h2 className="text-2xl font-bold">Compte</h2>

      {/* Email */}
      <Card>
        <CardHeader>
          <CardTitle>Adresse email</CardTitle>
          <CardDescription>
            Votre email actuel : <span className="font-medium text-foreground">{user?.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="new-email">Nouvel email</Label>
              <Input
                id="new-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nouveau@email.com"
              />
            </div>
            {emailError && <p className="text-sm text-red-500">{emailError}</p>}
            {emailSuccess && (
              <p className="text-sm text-green-600">
                Un email de confirmation a été envoyé à votre nouvelle adresse
              </p>
            )}
            <Button type="submit" disabled={isUpdatingEmail}>
              {isUpdatingEmail ? "Mise à jour..." : "Modifier l'email"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>
            Modifiez votre mot de passe de connexion
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
            <Button type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? "Mise à jour..." : "Modifier le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription / Stripe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={subscriptionVariant as "default" | "secondary" | "outline"}>
              {subscriptionLabel}
            </Badge>
            {profile?.subscription_type && (
              <span className="text-sm text-muted-foreground">
                ({profile.subscription_type === "promo" ? "Code promo" : "Payant"})
              </span>
            )}
          </div>

          {profile?.stripe_customer_id && (
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {isLoadingPortal ? "Redirection..." : "Gérer mon abonnement"}
            </Button>
          )}

          {!profile?.stripe_customer_id && profile?.subscription_status !== "active" && (
            <p className="text-sm text-muted-foreground">
              Aucun abonnement actif. Contactez votre coach pour obtenir un accès.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
