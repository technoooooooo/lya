"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { hasActiveAccess } from "@/lib/billing/access";
import { CheckCircle2, Loader2 } from "lucide-react";

/** Au-delà, on cesse d'attendre le webhook et on rassure sans bloquer. */
const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 1500;

/**
 * Stripe renvoie l'utilisateur ici dès le paiement accepté, mais l'accès n'est
 * ouvert que lorsque le webhook a été traité — quelques secondes plus tard. On
 * interroge le profil jusqu'à ce que le droit apparaisse.
 */
export function PaymentConfirmation() {
  const { profile, refreshProfile } = useAuth();
  const [attempts, setAttempts] = useState(0);

  const active = hasActiveAccess(profile);
  const stillWaiting = !active && attempts < MAX_ATTEMPTS;

  useEffect(() => {
    if (!stillWaiting) return;

    const timer = setTimeout(() => {
      refreshProfile();
      setAttempts((n) => n + 1);
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [stillWaiting, attempts, refreshProfile]);

  if (active) {
    return (
      <div className="text-center space-y-6">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Merci, votre accès est ouvert</h1>
          <p className="text-muted-foreground">
            Vous pouvez commencer à échanger avec Lya dès maintenant.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/">Commencer</Link>
        </Button>
      </div>
    );
  }

  if (stillWaiting) {
    return (
      <div className="text-center space-y-6">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Paiement reçu</h1>
          <p className="text-muted-foreground">Activation de votre accès en cours…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Paiement reçu</h1>
        <p className="text-muted-foreground">
          Votre accès s&apos;ouvrira d&apos;ici quelques minutes. Si ce n&apos;était pas le cas,
          écrivez à votre coach : le paiement est bien enregistré.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/account">Voir mon compte</Link>
      </Button>
    </div>
  );
}
