import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isOfferOnSale } from "@/lib/billing/offers";
import { SignUpFlow } from "@/components/auth/SignUpFlow";
import type { Offer } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ offre?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Déjà connecté : le choix d'une formule se fait depuis l'app.
  if (user) redirect("/abonnement");

  // La RLS des offres est réservée aux utilisateurs connectés ; ici le
  // visiteur n'a pas encore de compte. On relit donc avec la clé de service,
  // en reproduisant le même filtre (publiques, actives, dans leur fenêtre) et
  // sans exposer d'offre restreinte à l'Académie.
  const { data } = await getSupabaseAdmin()
    .from("offers")
    .select("*")
    .eq("visibility", "public")
    .eq("eligibility", "all")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const offers = ((data ?? []) as Offer[]).filter((offer) => isOfferOnSale(offer));
  const { offre } = await searchParams;

  return (
    <div className="flex min-h-svh">
      <div className="flex flex-1 justify-center px-4 py-8 sm:p-10 lg:items-center">
        <div className="w-full max-w-md">
          <SignUpFlow offers={offers} initialOfferId={offre} />
        </div>
      </div>
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden">
        {/* Mathieu est à ~28 % de la largeur de la photo : on l'aligne sur le
            centre du panneau quelle que soit la largeur (translateX est en %
            de l'image elle-même), au lieu d'un object-position fixe. */}
        <img
          src="/images/golf-hero.jpg"
          alt=""
          className="absolute top-0 left-1/2 h-full w-auto max-w-none -translate-x-[28%]"
        />
      </div>
    </div>
  );
}
