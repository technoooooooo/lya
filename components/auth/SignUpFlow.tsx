"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, KeyRound, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";
import { formatAmount, intervalLabel } from "@/lib/billing/offers";
import type { Offer } from "@/types/database";

type Step = "offer" | "account";

/** Ce que l'élève obtient, quelle que soit la formule. */
const BENEFITS = [
  "Les réponses de Mathieu, fidèles à sa méthode",
  "Des plans d'entraînement construits pour vous",
  "Photos, cartes de score et documents analysés",
  "Disponible 24h/24, sur mobile comme sur ordinateur",
];

/**
 * Parcours d'inscription en deux temps : choix de la formule, puis création
 * du compte. Le compte est créé confirmé côté serveur, la session est ouverte
 * dans la foulée et l'élève part directement sur le Checkout Stripe — aucun
 * aller-retour par email. Un code d'accès offert par le coach remplace le
 * paiement.
 */
export function SignUpFlow({
  offers,
  initialOfferId,
}: {
  offers: Offer[];
  initialOfferId?: string;
}) {
  const router = useRouter();
  const preselected =
    (initialOfferId &&
      offers.find((o) =>
        [o.id, o.slug, o.internal_name].includes(initialOfferId),
      )) ||
    offers[0] ||
    null;

  const [step, setStep] = useState<Step>(offers.length ? "offer" : "account");
  const [offerId, setOfferId] = useState<string | null>(
    preselected?.id ?? null,
  );
  const [useAccessCode, setUseAccessCode] = useState(offers.length === 0);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");

  // Une fois le compte créé, un nouvel essai ne relance que le paiement.
  const [accountCreated, setAccountCreated] = useState(false);
  // Code de réduction Stripe reconnu à l'inscription, appliqué au Checkout.
  const [promotionCode, setPromotionCode] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "account" | "payment">("idle");
  const [error, setError] = useState<string | null>(null);

  const offer = offers.find((o) => o.id === offerId) ?? null;
  const isBusy = phase !== "idle";

  const goToAccount = (withCode: boolean) => {
    setUseAccessCode(withCode);
    setError(null);
    setStep("account");
  };

  const startCheckout = async (id: string, code: string | null) => {
    setPhase("payment");
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId: id, promotionCode: code ?? undefined }),
    });
    const result = await res.json().catch(() => null);
    if (!result?.success) {
      // Code devenu invalide entre-temps : le prochain essai part sans remise.
      if (result?.error?.code === "INVALID_PROMOTION_CODE") setPromotionCode(null);
      throw new Error(
        result?.error?.message ??
          "Le service de paiement ne répond pas. Réessayez dans un instant.",
      );
    }
    window.location.href = result.data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let code = promotionCode;
    try {
      if (!accountCreated) {
        setPhase("account");
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            accessCode: useAccessCode ? accessCode : undefined,
          }),
        });
        const result = await res.json().catch(() => null);
        if (!result?.success) {
          throw new Error(result?.error?.message ?? "Une erreur est survenue");
        }

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          throw new Error(
            "Votre compte est créé, mais la connexion a échoué. Connectez-vous pour continuer.",
          );
        }
        setAccountCreated(true);
        code = result.data.promotionCode ?? null;
        setPromotionCode(code);

        if (result.data.accessGranted) {
          router.push("/");
          router.refresh();
          return;
        }
      }

      if (!offer) {
        // Code d'accès consommé entre-temps : le compte existe, il reste à choisir une formule.
        router.push("/account");
        return;
      }
      await startCheckout(offer.id, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setPhase("idle");
    }
  };

  return (
    <div className="flex flex-col gap-7">
      {/* En-tête */}
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandLogo size={72} className="rounded-2xl shadow-sm" />
        <h1 className="sr-only">{BRAND_NAME}</h1>
        <div className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight">
            {step === "offer"
              ? "Choisissez votre formule"
              : "Créez votre compte"}
          </p>
          <p className="text-sm text-muted-foreground">
            {step === "offer"
              ? "Votre coach golf IA, fidèle à la méthode de Mathieu."
              : useAccessCode
                ? "Saisissez le code d'accès remis par votre coach."
                : "Plus qu'une étape avant le paiement sécurisé."}
          </p>
        </div>
      </div>

      {offers.length > 0 && (
        <Stepper step={step} onBack={() => !isBusy && setStep("offer")} />
      )}

      {step === "offer" ? (
        <div
          key="offer"
          className="flex flex-col gap-5 animate-in fade-in slide-in-from-left-4 duration-300"
        >
          <div
            role="radiogroup"
            aria-label="Formule"
            className="flex flex-col gap-3"
          >
            {offers.map((o) => (
              <OfferOption
                key={o.id}
                offer={o}
                selected={o.id === offerId}
                onSelect={() => setOfferId(o.id)}
              />
            ))}
          </div>

          <ul className="grid gap-2 rounded-2xl border border-dashed px-5 py-4 text-sm">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-golf" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            className="h-11 w-full bg-golf text-golf-foreground hover:bg-golf/90"
            disabled={!offer}
            onClick={() => goToAccount(false)}
          >
            Continuer
          </Button>

          {!accountCreated && (
            <button
              type="button"
              onClick={() => goToAccount(true)}
              className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <KeyRound className="h-3.5 w-3.5" />
              J&apos;ai un code d&apos;accès offert par mon coach
            </button>
          )}
        </div>
      ) : (
        <div
          key="account"
          className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300"
        >
          {/* Rappel de la formule choisie */}
          {!useAccessCode && offer && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {offer.display_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatAmount(offer.amount_cents, offer.currency)}{" "}
                  {intervalLabel(offer) ?? ""}
                  {offer.trial_days
                    ? ` · ${offer.trial_days} jours d'essai`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("offer")}
                disabled={isBusy}
                className="shrink-0 text-sm font-medium text-golf hover:underline disabled:opacity-50"
              >
                Modifier
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <fieldset
              disabled={isBusy || accountCreated}
              className="flex flex-col gap-4"
            >
              {useAccessCode && (
                <div className="grid gap-2">
                  <Label htmlFor="access-code">Code d&apos;accès</Label>
                  <Input
                    id="access-code"
                    required
                    autoComplete="off"
                    placeholder="EX. TGA2026"
                    className="uppercase placeholder:normal-case"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Mot de passe</Label>
                <PasswordInput
                  id="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  8 caractères minimum.
                </p>
              </div>
            </fieldset>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
                {error.includes("existe déjà") && (
                  <>
                    {" "}
                    <Link href="/auth/login" className="font-medium underline">
                      Se connecter
                    </Link>
                  </>
                )}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full bg-golf text-golf-foreground hover:bg-golf/90"
              disabled={isBusy}
            >
              {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {phase === "account"
                ? "Création du compte…"
                : phase === "payment"
                  ? "Redirection vers le paiement…"
                  : accountCreated
                    ? "Reprendre le paiement"
                    : useAccessCode
                      ? "Créer mon compte"
                      : "Créer mon compte et payer"}
            </Button>

            {!useAccessCode && (
              <p className="flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <Lock className="mt-px h-3 w-3 shrink-0" />
                <span>
                  Paiement sécurisé par Stripe. Un code de réduction ? Vous le
                  saisirez à l&apos;étape du paiement.
                </span>
              </p>
            )}

            {useAccessCode && offers.length > 0 && !accountCreated && (
              <button
                type="button"
                onClick={() => {
                  setUseAccessCode(false);
                  setStep("offer");
                }}
                className="mx-auto text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Pas de code ? Choisir une formule
              </button>
            )}
          </form>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-golf hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}

function Stepper({ step, onBack }: { step: Step; onBack: () => void }) {
  const steps: Array<{ id: Step; label: string }> = [
    { id: "offer", label: "Formule" },
    { id: "account", label: "Compte" },
  ];
  const current = steps.findIndex((s) => s.id === step);

  return (
    <div className="relative flex items-center justify-center">
      {step === "account" && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Revenir au choix de la formule"
          className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <ol className="flex items-center gap-3 text-sm">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3">
            {i > 0 && (
              <span
                className={cn(
                  "h-px w-8 transition-colors",
                  i <= current ? "bg-golf" : "bg-border",
                )}
              />
            )}
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  i < current && "bg-golf text-golf-foreground",
                  i === current &&
                    "bg-golf text-golf-foreground ring-4 ring-golf/20",
                  i > current && "border text-muted-foreground",
                )}
              >
                {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  i === current ? "font-medium" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function OfferOption({
  offer,
  selected,
  onSelect,
}: {
  offer: Offer;
  selected: boolean;
  onSelect: () => void;
}) {
  const interval = intervalLabel(offer);
  const savings =
    offer.compare_at_cents && offer.compare_at_cents > offer.amount_cents
      ? Math.round((1 - offer.amount_cents / offer.compare_at_cents) * 100)
      : null;
  const monthlyEquivalent =
    offer.mode === "subscription" && offer.recurring_interval === "year"
      ? formatAmount(
          Math.round(
            offer.amount_cents / (12 * offer.recurring_interval_count),
          ),
          offer.currency,
        )
      : null;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative flex w-full items-start gap-4 rounded-2xl border bg-card p-4 text-left transition-all",
        "hover:border-golf/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-golf/40",
        selected && "border-golf shadow-sm ring-1 ring-golf",
      )}
    >
      <span
        className={cn(
          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-golf bg-golf" : "border-muted-foreground/40",
        )}
      >
        {selected && (
          <span className="h-2 w-2 rounded-full bg-golf-foreground" />
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{offer.display_name}</span>
          {savings !== null && savings > 0 && (
            <span className="rounded-full bg-golf/15 px-2 py-0.5 text-xs font-semibold text-golf">
              −{savings} %
            </span>
          )}
        </span>
        {offer.description && (
          <span className="text-xs leading-relaxed text-muted-foreground">
            {offer.description}
          </span>
        )}
        {offer.trial_days ? (
          <span className="text-xs font-medium text-golf">
            {offer.trial_days} jours d&apos;essai gratuit
          </span>
        ) : null}
      </span>

      <span className="flex shrink-0 flex-col items-end">
        <span className="flex items-baseline gap-1">
          <span className="text-xl font-semibold tabular-nums">
            {formatAmount(offer.amount_cents, offer.currency)}
          </span>
          {interval && (
            <span className="text-xs text-muted-foreground">{interval}</span>
          )}
        </span>
        {monthlyEquivalent && (
          <span className="text-xs text-muted-foreground">
            soit {monthlyEquivalent} / mois
          </span>
        )}
        {savings !== null && offer.compare_at_cents && (
          <span className="text-xs text-muted-foreground line-through">
            {formatAmount(offer.compare_at_cents, offer.currency)}
          </span>
        )}
      </span>
    </button>
  );
}
