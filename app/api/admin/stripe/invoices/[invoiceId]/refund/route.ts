import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { refundInvoice } from "@/lib/stripe/admin";
import { invalidatePaymentsCache } from "@/lib/admin/payments";
import { ok, fail, failFrom } from "@/lib/admin/http";

/**
 * Rembourse le paiement d'une facture Lya (total, ou partiel si amountCents).
 * Le remboursement ne coupe pas l'accès : résilier l'abonnement si besoin.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { invoiceId } = await params;
  const { amountCents } = (await request.json().catch(() => ({}))) as { amountCents?: number };
  if (amountCents !== undefined && (!Number.isInteger(amountCents) || amountCents <= 0)) {
    return fail("Montant invalide", "INVALID_INPUT", 400);
  }

  try {
    await refundInvoice(invoiceId, amountCents);
    invalidatePaymentsCache();
    return ok({ refunded: true });
  } catch (error) {
    return failFrom(error, `remboursement ${invoiceId}`);
  }
}
