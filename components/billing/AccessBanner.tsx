"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { hasActiveAccess, isPaymentAtRisk, daysRemaining } from "@/lib/billing/access";
import { AlertTriangle, ArrowRight, Lock } from "lucide-react";

/**
 * Bandeau d'état de l'accès, en haut de l'application.
 *
 * Deux situations, jamais les deux à la fois :
 *  - impayé en cours de relance Stripe : l'accès est maintenu (décision
 *    client : ne pas couper avant la fin des trois semaines de relances), mais
 *    l'utilisateur doit pouvoir régulariser tout de suite ;
 *  - aucun accès : on renvoie vers les offres plutôt que de laisser le chat
 *    répondre par une erreur au premier message.
 */
export function AccessBanner() {
  const { profile, isAdmin, isLoading } = useAuth();
  const pathname = usePathname();

  // Les admins utilisent l'app sans abonnement, et on n'affiche rien sur les
  // pages qui parlent déjà d'abonnement.
  if (isLoading || isAdmin || !profile) return null;
  if (pathname.startsWith("/abonnement") || pathname.startsWith("/account")) return null;

  if (isPaymentAtRisk(profile)) {
    const days = daysRemaining(profile);

    return (
      <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm text-amber-950">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">Paiement en échec.</span>{" "}
            Votre accès reste ouvert
            {days !== null && days > 0 ? ` encore ${days} jour${days > 1 ? "s" : ""}` : ""}, le
            temps de mettre à jour votre moyen de paiement.
          </span>
        </div>
        <Link
          href="/account"
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-amber-950/15 px-3 py-1 font-medium transition-colors hover:bg-amber-950/25"
        >
          Régulariser
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (!hasActiveAccess(profile)) {
    return (
      <div className="flex items-center justify-between gap-3 bg-muted px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          <span>Votre accès à TGA n&apos;est pas actif.</span>
        </div>
        <Link
          href="/abonnement"
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-foreground/10 px-3 py-1 font-medium transition-colors hover:bg-foreground/20"
        >
          Voir les offres
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return null;
}
