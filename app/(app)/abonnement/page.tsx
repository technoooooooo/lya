import { redirect } from "next/navigation";

// Fusionnée dans « Mon compte ». Conservée pour les anciens liens (emails,
// retour Stripe) ; /abonnement/merci reste la page de confirmation de paiement.
export default function AbonnementPage() {
  redirect("/account#acces");
}
