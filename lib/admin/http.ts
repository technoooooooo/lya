import { NextResponse } from "next/server";
import { StripeApiError } from "@/lib/stripe/api";
import { ForeignStripeObjectError } from "@/lib/stripe/admin";

export function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

export function fail(message: string, code: string, status: number) {
  return NextResponse.json({ success: false, error: { message, code } }, { status });
}

/**
 * Traduit les erreurs courantes du back-office en réponse lisible : une erreur
 * Stripe remonte avec son message (clé sans droit d'écriture, code déjà pris…)
 * plutôt qu'un « Erreur serveur » muet.
 */
export function failFrom(error: unknown, context: string) {
  if (error instanceof ForeignStripeObjectError) return fail(error.message, "FOREIGN_OBJECT", 403);
  if (error instanceof StripeApiError) {
    console.error(`[ADMIN] ${context} — Stripe`, error.status, error.message);
    const status = error.status >= 400 && error.status < 500 ? 400 : 502;
    return fail(`Stripe : ${error.message}`, error.code ?? "STRIPE_ERROR", status);
  }
  console.error(`[ADMIN] ${context}`, error);
  return fail(error instanceof Error ? error.message : "Erreur serveur", "SERVER_ERROR", 500);
}
