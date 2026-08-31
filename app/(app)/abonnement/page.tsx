import { createClient } from "@/lib/supabase/server";
import { OfferCard } from "@/components/billing/OfferCard";
import { Button } from "@/components/ui/button";
import { hasActiveAccess, accessSourceLabel } from "@/lib/billing/access";
import { isOfferOnSale } from "@/lib/billing/offers";
import type { Offer, Profile } from "@/types/database";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AbonnementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // La politique RLS ne renvoie que les offres publiques, actives et dans leur
  // fenêtre de vente : les offres privées ne fuitent jamais par ce listing.
  const [{ data: offerRows }, { data: profileRow }] = await Promise.all([
    supabase.from("offers").select("*").order("display_order", { ascending: true }),
    user
      ? supabase.from("profiles").select("*").eq("user_id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const offers = ((offerRows ?? []) as Offer[]).filter((offer) => isOfferOnSale(offer));
  const profile = profileRow as Profile | null;
  const subscribed = hasActiveAccess(profile);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {subscribed ? "Votre accès à Lya" : "Accéder à Lya"}
        </h1>
        <p className="text-muted-foreground">
          {subscribed
            ? "Votre accès est actif. Vous pouvez le gérer depuis votre compte."
            : "Choisissez la formule qui correspond à votre pratique."}
        </p>
      </header>

      {subscribed && (
        <div className="rounded-lg border bg-muted/40 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm">
            <span className="font-medium">{accessSourceLabel(profile?.access_source)}</span>
            {profile?.has_lifetime_access ? (
              <span className="text-muted-foreground"> — accès à vie</span>
            ) : (
              profile?.access_until && (
                <span className="text-muted-foreground">
                  {" — jusqu'au "}
                  {new Date(profile.access_until).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/account">Gérer mon abonnement</Link>
          </Button>
        </div>
      )}

      {offers.length === 0 ? (
        <p className="text-muted-foreground">
          Aucune offre n&apos;est disponible pour le moment. Contactez votre coach.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {offers.map((offer, index) => (
            <OfferCard key={offer.id} offer={offer} highlighted={index === 0 && !subscribed} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Paiement sécurisé par Stripe. Vous pouvez résilier à tout moment depuis votre compte ;
        votre accès reste ouvert jusqu&apos;au terme de la période déjà réglée.
      </p>
    </div>
  );
}
