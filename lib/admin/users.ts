import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasActiveAccess, isPaymentAtRisk } from "@/lib/billing/access";
import type { AccessSource, Profile } from "@/types/database";

/**
 * Vue consolidée d'un utilisateur pour le back-office : profil, compte auth
 * (email, dernière connexion), état d'accès et activité dans le chat.
 * Lecture à la clé de service — appelée uniquement derrière requireAdmin().
 */

export type AccessState = "lifetime" | "active" | "past_due" | "expired" | "none";

export interface AdminUserRow {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  golfClub: string | null;
  avatarUrl: string | null;
  role: Profile["role"];
  isActive: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  access: {
    state: AccessState;
    until: string | null;
    source: AccessSource | null;
  };
  stripeCustomerId: string | null;
  activity: {
    conversations: number;
    userMessages: number;
    lastMessageAt: string | null;
  } | null;
}

export function accessState(profile: Profile): AccessState {
  if (profile.has_lifetime_access && profile.is_active) return "lifetime";
  if (isPaymentAtRisk(profile)) return "past_due";
  if (hasActiveAccess(profile)) return "active";
  // Un accès a existé (date passée) : l'utilisateur est un ancien client.
  if (profile.access_until) return "expired";
  return "none";
}

/** Tous les comptes auth (l'API admin pagine par 1 000). */
async function listAuthUsers(): Promise<User[]> {
  const admin = getSupabaseAdmin();
  const users: User[] = [];

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

type ActivityRow = {
  user_id: string;
  conversations: number;
  user_messages: number;
  last_message_at: string | null;
};

/** Activité par utilisateur (migration 021). Absente tant que la migration n'est pas passée. */
async function loadActivity(): Promise<Map<string, ActivityRow> | null> {
  const { data, error } = await getSupabaseAdmin().rpc("admin_user_activity");
  if (error) {
    console.warn("[ADMIN] admin_user_activity indisponible", error.message);
    return null;
  }
  return new Map((data as ActivityRow[]).map((row) => [row.user_id, row]));
}

export function toAdminUserRow(
  profile: Profile,
  authUser: User | undefined,
  activity: Map<string, ActivityRow> | null
): AdminUserRow {
  const act = activity?.get(profile.user_id);
  return {
    userId: profile.user_id,
    email: authUser?.email ?? null,
    firstName: profile.first_name,
    lastName: profile.last_name,
    golfClub: profile.golf_club,
    avatarUrl: profile.avatar_url,
    role: profile.role,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    lastSignInAt: authUser?.last_sign_in_at ?? null,
    emailConfirmed: Boolean(authUser?.email_confirmed_at),
    access: {
      state: accessState(profile),
      until: profile.has_lifetime_access ? null : profile.access_until,
      source: profile.access_source,
    },
    stripeCustomerId: profile.stripe_customer_id,
    activity: activity
      ? {
          conversations: Number(act?.conversations ?? 0),
          userMessages: Number(act?.user_messages ?? 0),
          lastMessageAt: act?.last_message_at ?? null,
        }
      : null,
  };
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const admin = getSupabaseAdmin();
  const [{ data: profiles, error }, authUsers, activity] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }),
    listAuthUsers(),
    loadActivity(),
  ]);
  if (error) throw error;

  const byId = new Map(authUsers.map((u) => [u.id, u]));
  return ((profiles ?? []) as Profile[]).map((p) => toAdminUserRow(p, byId.get(p.user_id), activity));
}

export async function getAdminUser(userId: string): Promise<{ row: AdminUserRow; profile: Profile } | null> {
  const admin = getSupabaseAdmin();
  const [{ data: profile }, { data: auth }, activity] = await Promise.all([
    admin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
    loadActivity(),
  ]);
  if (!profile) return null;
  return { row: toAdminUserRow(profile as Profile, auth?.user ?? undefined, activity), profile: profile as Profile };
}
