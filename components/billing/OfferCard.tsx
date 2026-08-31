"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount, intervalLabel, accessLabel } from "@/lib/billing/offers";
import type { Offer } from "@/types/database";
import { Clock } from "lucide-react";

/** Compte à rebours des offres à fenêtre (conférence, opération de fin d'année). */
function ClosingSoon({ until }: { until: string }) {
  const days = Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000);
  if (days > 7) return null;

  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      {days <= 1 ? "Dernier jour" : `Plus que ${days} jours`}
    </Badge>
  );
}

export function OfferCard({ offer, highlighted }: { offer: Offer; highlighted?: boolean }) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    setIsRedirecting(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id }),
      });
      const result = await res.json();

      if (!result.success) {
        setError(result.error.message);
        setIsRedirecting(false);
        return;
      }

      window.location.href = result.data.url;
    } catch {
      setError("Impossible de joindre le service de paiement. Réessayez dans un instant.");
      setIsRedirecting(false);
    }
  };

  const interval = intervalLabel(offer);

  return (
    <Card className={highlighted ? "border-primary shadow-md" : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{offer.display_name}</CardTitle>
          {offer.available_until && <ClosingSoon until={offer.available_until} />}
        </div>
        {offer.description && <CardDescription>{offer.description}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold">
            {formatAmount(offer.amount_cents, offer.currency)}
          </span>
          {interval && <span className="text-muted-foreground">{interval}</span>}
          {offer.compare_at_cents && offer.compare_at_cents > offer.amount_cents && (
            <span className="text-sm text-muted-foreground line-through">
              {formatAmount(offer.compare_at_cents, offer.currency)}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{accessLabel(offer)}</p>

        {offer.trial_days && (
          <p className="text-sm text-muted-foreground">
            {offer.trial_days} jours d&apos;essai gratuit
          </p>
        )}

        <Button onClick={subscribe} disabled={isRedirecting} className="w-full">
          {isRedirecting ? "Redirection…" : "Choisir cette offre"}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
