import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

/**
 * Point d'arrivée des liens envoyés par email (réinitialisation de mot de
 * passe, confirmation d'inscription). Deux formats de lien sont acceptés :
 * - `?token_hash=…&type=…` : lien qui pointe directement ici (modèle d'email
 *   personnalisé, fonctionne même si l'email est ouvert dans un autre navigateur)
 * - `?code=…` : lien par défaut de Supabase (PKCE), qui passe par
 *   supabase.co/auth/v1/verify puis redirige ici
 * Dans les deux cas la session est posée en cookie côté serveur avant la
 * redirection vers `next`, donc le middleware voit un utilisateur connecté.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
    redirect(next);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
    redirect(next);
  }

  redirect(`/auth/error?error=${encodeURIComponent("Lien invalide ou expiré")}`);
}

/** N'accepte qu'un chemin relatif de l'application (pas de redirection ouverte). */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}
