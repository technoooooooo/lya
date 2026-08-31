import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, serverEnv } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Client Supabase à clé de service : contourne les RLS. Réservé aux traitements
 * sans utilisateur authentifié (webhooks Stripe, pont systeme.io). Ne jamais
 * l'exposer à une route empruntée par le navigateur.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const serviceRoleKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !serviceRoleKey) {
    throw new Error("Variables Supabase manquantes pour le client admin");
  }

  cached = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
