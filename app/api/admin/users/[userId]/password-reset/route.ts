import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import { ok, fail, failFrom } from "@/lib/admin/http";

/** Envoie à l'utilisateur l'email « mot de passe oublié » (modèle TGA). */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { userId } = await params;
  const { data } = await getSupabaseAdmin().auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (!email) return fail("Utilisateur sans email", "NOT_FOUND", 404);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/auth/update-password`,
  });
  if (error) return failFrom(error, "email de réinitialisation");
  return ok({ sentTo: email });
}
