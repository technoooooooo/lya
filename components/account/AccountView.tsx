"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { OfferCard } from "@/components/billing/OfferCard";
import { hasActiveAccess, isPaymentAtRisk } from "@/lib/billing/access";
import { formatAmount } from "@/lib/billing/offers";
import type { MySubscription } from "@/lib/stripe/admin";
import type { Offer, Profile } from "@/types/database";

type Feedback = { type: "success" | "error"; text: string } | null;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function AccountView({
  offers,
  subscription,
}: {
  offers: Offer[];
  subscription: MySubscription | null;
}) {
  const { user, profile, isAdmin } = useAuth();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 px-4 py-8 sm:px-8 sm:py-10">
      <IdentityHeader />

      <Section id="acces" title="Mon accès">
        <AccessPanel
          profile={profile}
          isAdmin={isAdmin}
          subscription={subscription}
          offers={offers}
        />
      </Section>

      <Section
        id="informations"
        title="Mes informations"
        description="Elles permettent à votre coach IA de mieux vous connaître."
      >
        <ProfileForm profile={profile} />
      </Section>

      <Section id="connexion" title="Connexion et sécurité">
        <div className="divide-y rounded-xl border bg-card">
          <EmailRow email={user?.email ?? ""} />
          <PasswordRow />
        </div>
      </Section>

      <div className="flex justify-center border-t pt-8">
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground"
          onClick={() => {
            fetch("/auth/signout", { method: "POST" }).finally(() => {
              window.location.href = "/auth/login";
            });
          }}
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function InlineFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      role={feedback.type === "error" ? "alert" : "status"}
      className={cn(
        "text-sm",
        feedback.type === "success" ? "text-golf" : "text-destructive"
      )}
    >
      {feedback.text}
    </p>
  );
}

// --- En-tête : photo, nom, email ---------------------------------------------------

function IdentityHeader() {
  const { user, profile, refreshProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const initial = (profile?.first_name || user?.email || "?").charAt(0).toUpperCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    setIsUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      // Paramètre anti-cache : le chemin du fichier ne change pas d'une photo à l'autre.
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      await refreshProfile();
    } catch (err) {
      console.error("Avatar upload error:", err);
      setError("La photo n'a pas pu être enregistrée. Réessayez avec une image JPG ou PNG.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <header className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label="Changer ma photo de profil"
        className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-golf text-2xl font-medium text-golf-foreground">
            {initial}
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-foreground text-background transition-transform group-hover:scale-110">
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      <div className="min-w-0 space-y-0.5">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {fullName || "Mon compte"}
        </h1>
        <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </header>
  );
}

// --- Accès : état, formule, paiement, offres ------------------------------------------

function subscriptionPrice(sub: MySubscription): string {
  const amount = formatAmount(sub.amount, sub.currency);
  const units: Record<string, [string, string]> = {
    day: ["jour", "jours"],
    week: ["semaine", "semaines"],
    month: ["mois", "mois"],
    year: ["an", "ans"],
  };
  const unit = sub.interval ? units[sub.interval] : null;
  if (!unit) return amount;
  return sub.intervalCount === 1 ? `${amount} / ${unit[0]}` : `${amount} / ${sub.intervalCount} ${unit[1]}`;
}

function AccessPanel({
  profile,
  isAdmin,
  subscription,
  offers,
}: {
  profile: Profile | null;
  isAdmin: boolean;
  subscription: MySubscription | null;
  offers: Offer[];
}) {
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const active = hasActiveAccess(profile);
  const atRisk = isPaymentAtRisk(profile);
  const renews = Boolean(subscription && !subscription.cancelAtPeriodEnd);
  const canManageBilling = Boolean(profile?.stripe_customer_id);

  const openPortal = async () => {
    setIsOpeningPortal(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message);
      window.location.href = result.data.url;
    } catch {
      setPortalError("L'espace de paiement ne répond pas. Réessayez dans un instant.");
      setIsOpeningPortal(false);
    }
  };

  // --- Ce qu'on dit de l'accès, du plus urgent au plus neutre.
  let tone: "ok" | "warn" | "off" = "off";
  let title = "Aucun accès actif";
  let detail = "Choisissez une formule pour échanger avec votre coach IA.";

  if (isAdmin) {
    tone = "ok";
    title = "Compte coach";
    detail = "Accès complet à l'application, sans abonnement.";
  } else if (atRisk) {
    tone = "warn";
    title = "Paiement à régulariser";
    detail =
      "Votre dernier prélèvement a échoué. Votre accès reste ouvert quelques jours : mettez à jour votre carte pour éviter la coupure.";
  } else if (active) {
    tone = "ok";
    title = "Accès actif";
    if (profile?.has_lifetime_access) {
      detail = "Accès à vie, sans échéance.";
    } else if (subscription?.status === "trialing" && subscription.trialEnd) {
      detail = `Essai gratuit jusqu'au ${formatDate(subscription.trialEnd)}, puis ${subscriptionPrice(subscription)}.`;
    } else if (renews && subscription?.currentPeriodEnd) {
      detail = `Renouvellement automatique le ${formatDate(subscription.currentPeriodEnd)}.`;
    } else if (profile?.access_until) {
      detail = subscription?.cancelAtPeriodEnd
        ? `Abonnement résilié : votre accès reste ouvert jusqu'au ${formatDate(profile.access_until)}.`
        : `Accès jusqu'au ${formatDate(profile.access_until)}.`;
    }
  }

  // Formule payante en cours : rien à racheter. Sinon (aucun accès, accès
  // offert ou à durée limitée, abonnement résilié), les offres sont là.
  const showOffers = !isAdmin && !profile?.has_lifetime_access && !renews && offers.length > 0;

  const StatusIcon = tone === "ok" ? CheckCircle2 : tone === "warn" ? AlertTriangle : Lock;

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "rounded-xl border bg-card p-5 sm:p-6",
          tone === "warn" && "border-amber-500/50 bg-amber-500/5"
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              tone === "ok" && "bg-golf/10 text-golf",
              tone === "warn" && "bg-amber-500/15 text-amber-600",
              tone === "off" && "bg-muted text-muted-foreground"
            )}
          >
            <StatusIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{detail}</p>
          </div>
        </div>

        {subscription && !isAdmin && (
          <dl className="mt-5 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Formule</dt>
              <dd className="font-medium">{subscription.offerName ?? "Abonnement TGA"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tarif</dt>
              <dd className="font-medium">{subscriptionPrice(subscription)}</dd>
            </div>
          </dl>
        )}

        {canManageBilling && !isAdmin && (
          <div className="mt-5 flex flex-col gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Carte bancaire, factures, résiliation : tout se gère sur l&apos;espace sécurisé Stripe.
            </p>
            <Button
              variant={atRisk ? "default" : "outline"}
              onClick={openPortal}
              disabled={isOpeningPortal}
              className="shrink-0 gap-2"
            >
              {isOpeningPortal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {atRisk ? "Mettre à jour ma carte" : "Gérer mon abonnement"}
            </Button>
          </div>
        )}
        {portalError && <p className="mt-3 text-sm text-destructive">{portalError}</p>}
      </div>

      {showOffers && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-medium">
              {active ? "Continuer après votre accès actuel" : "Choisissez votre formule"}
            </h3>
            {active && (
              <p className="text-sm text-muted-foreground">
                Souscrivez dès maintenant pour ne pas perdre l&apos;accès. Le paiement démarre le
                jour de la souscription.
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {offers.map((offer, index) => (
              <OfferCard key={offer.id} offer={offer} highlighted={index === 0 && !active} />
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Paiement sécurisé par Stripe. Résiliable à tout moment : l&apos;accès reste ouvert
            jusqu&apos;au terme de la période réglée.
          </p>
        </div>
      )}
    </div>
  );
}

// --- Informations personnelles -------------------------------------------------------

function ProfileForm({ profile }: { profile: Profile | null }) {
  const { user, refreshProfile } = useAuth();
  const initial = {
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    golfClub: profile?.golf_club ?? "",
  };
  const [values, setValues] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const dirty =
    values.firstName.trim() !== initial.firstName ||
    values.lastName.trim() !== initial.lastName ||
    values.golfClub.trim() !== initial.golfClub;

  // Le message de succès s'efface de lui-même.
  useEffect(() => {
    if (feedback?.type !== "success") return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const { error } = await createClient()
        .from("profiles")
        .update({
          first_name: values.firstName.trim() || null,
          last_name: values.lastName.trim() || null,
          golf_club: values.golfClub.trim() || null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      setFeedback({ type: "success", text: "Informations enregistrées." });
    } catch (err) {
      console.error("Save profile error:", err);
      setFeedback({ type: "error", text: "L'enregistrement a échoué. Réessayez." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" autoComplete="given-name" value={values.firstName} onChange={set("firstName")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" autoComplete="family-name" value={values.lastName} onChange={set("lastName")} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="golfClub">Club de golf</Label>
        <Input
          id="golfClub"
          autoComplete="off"
          placeholder="Ex. Golf de Saint-Cloud"
          value={values.golfClub}
          onChange={set("golfClub")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!dirty || isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <InlineFeedback feedback={feedback} />
      </div>
    </form>
  );
}

// --- Connexion : email et mot de passe -------------------------------------------------

function SettingRow({
  label,
  value,
  editing,
  onEdit,
  feedback,
  children,
}: {
  label: string;
  value: React.ReactNode;
  editing: boolean;
  onEdit: () => void;
  feedback: Feedback;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate font-medium">{value}</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            Modifier
          </Button>
        )}
      </div>
      {editing && <div className="mt-4">{children}</div>}
      {feedback && (
        <div className="mt-3">
          <InlineFeedback feedback={feedback} />
        </div>
      )}
    </div>
  );
}

function EmailRow({ email }: { email: string }) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const close = () => {
    setEditing(false);
    setNewEmail("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const { error } = await createClient().auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      close();
      setFeedback({
        type: "success",
        text: `Un lien de confirmation a été envoyé à ${newEmail.trim()}. L'adresse changera une fois le lien ouvert.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Une erreur est survenue",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingRow
      label="Adresse email"
      value={email}
      editing={editing}
      feedback={feedback}
      onEdit={() => {
        setEditing(true);
        setFeedback(null);
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-2">
          <Label htmlFor="new-email">Nouvelle adresse</Label>
          <Input
            id="new-email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving || !newEmail.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Envoyer le lien de confirmation
          </Button>
          <Button type="button" variant="ghost" onClick={close} disabled={isSaving}>
            Annuler
          </Button>
        </div>
      </form>
    </SettingRow>
  );
}

function PasswordRow() {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const close = () => {
    setEditing(false);
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setFeedback({ type: "error", text: "8 caractères minimum." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      close();
      setFeedback({ type: "success", text: "Mot de passe modifié." });
    } catch (err) {
      setFeedback({
        type: "error",
        text:
          err instanceof Error && /different|same/i.test(err.message)
            ? "Choisissez un mot de passe différent de l'actuel."
            : err instanceof Error
              ? err.message
              : "Une erreur est survenue",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingRow
      label="Mot de passe"
      value="••••••••"
      editing={editing}
      feedback={feedback}
      onEdit={() => {
        setEditing(true);
        setFeedback(null);
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-2">
          <Label htmlFor="new-password">Nouveau mot de passe</Label>
          <PasswordInput
            id="new-password"
            required
            autoFocus
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving || !password}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
          <Button type="button" variant="ghost" onClick={close} disabled={isSaving}>
            Annuler
          </Button>
        </div>
      </form>
    </SettingRow>
  );
}
