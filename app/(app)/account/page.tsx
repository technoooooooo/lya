import { createClient } from "@/lib/supabase/server";
import { AccountView } from "@/components/account/AccountView";
import { isOfferOnSale } from "@/lib/billing/offers";
import { currentLyaSubscription, type MySubscription } from "@/lib/stripe/admin";
import type { Offer } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * « Mon compte » : une seule page pour l'accès (état, formule, paiement),
 * les informations personnelles et la connexion. Remplace les anciennes pages
 * Informations / Compte / Abonnement, qui redirigent ici.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // La RLS ne renvoie que les offres publiques, actives et dans leur fenêtre.
  const [{ data: offerRows }, { data: profileRow }] = await Promise.all([
    supabase.from("offers").select("*").order("display_order", { ascending: true }),
    user
      ? supabase.from("profiles").select("stripe_customer_id").eq("user_id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const offers = ((offerRows ?? []) as Offer[]).filter((offer) => isOfferOnSale(offer));

  // Stripe indisponible : la page reste utilisable, sans le détail de la formule.
  let subscription: MySubscription | null = null;
  try {
    subscription = await currentLyaSubscription(profileRow?.stripe_customer_id ?? null);
  } catch (err) {
    console.error("[ACCOUNT] lecture de l'abonnement Stripe impossible", err);
  }

  return <AccountView offers={offers} subscription={subscription} />;
}
