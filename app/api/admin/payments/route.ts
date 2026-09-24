import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { paymentsOverview } from "@/lib/admin/payments";
import { ok, failFrom } from "@/lib/admin/http";

/** Suivi Stripe en direct : KPIs, abonnements et factures Lya. `?refresh=1` ignore le cache. */
export async function GET(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    return ok(await paymentsOverview(request.nextUrl.searchParams.get("refresh") === "1"));
  } catch (error) {
    return failFrom(error, "suivi des paiements");
  }
}
