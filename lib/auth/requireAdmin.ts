import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

type RequireAdminResult =
  | { supabase: SupabaseClient; user: User; response: null }
  | { supabase: SupabaseClient; user: User | null; response: NextResponse };

/**
 * Vérifie que la requête provient d'un admin authentifié.
 * Renvoie le client Supabase (scopé utilisateur) et l'utilisateur, ou une
 * NextResponse d'erreur prête à être retournée (401 / 403).
 *
 * Usage :
 *   const { supabase, response } = await requireAdmin();
 *   if (response) return response;
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      response: NextResponse.json(
        { success: false, error: { message: "Non authentifié", code: "UNAUTHORIZED" } },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      supabase,
      user,
      response: NextResponse.json(
        { success: false, error: { message: "Accès interdit", code: "FORBIDDEN" } },
        { status: 403 }
      ),
    };
  }

  return { supabase, user, response: null };
}
