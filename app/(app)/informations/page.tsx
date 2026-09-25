import { redirect } from "next/navigation";

// Fusionnée dans « Mon compte ». Conservée pour les anciens liens.
export default function InformationsPage() {
  redirect("/account#informations");
}
