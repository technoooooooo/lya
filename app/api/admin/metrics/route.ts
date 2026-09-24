import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { accessState } from "@/lib/admin/users";
import { ok, failFrom } from "@/lib/admin/http";
import type { Profile } from "@/types/database";

// « fr-CA » formate en AAAA-MM-JJ.
const PARIS_DAY = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

/**
 * Indicateurs utilisateurs du tableau de bord (les indicateurs de revenus
 * viennent de /api/admin/payments, en direct de Stripe).
 */
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const admin = getSupabaseAdmin();
    const [{ data: profiles, error }, conversations, messages, activity] = await Promise.all([
      admin.from("profiles").select("*"),
      admin.from("conversations").select("*", { count: "exact", head: true }),
      admin.from("messages").select("*", { count: "exact", head: true }),
      admin.rpc("admin_user_activity"),
    ]);
    if (error) throw error;

    const rows = (profiles ?? []) as Profile[];
    const states = rows.map((p) => ({ profile: p, state: accessState(p) }));
    const withAccess = states.filter((s) => ["active", "lifetime", "past_due"].includes(s.state));

    const bySource: Record<string, number> = {};
    for (const { profile } of withAccess) {
      const key = profile.access_source ?? "manual";
      bySource[key] = (bySource[key] ?? 0) + 1;
    }

    // Inscriptions par jour (heure de Paris — le serveur Vercel tourne en UTC)
    // sur 30 jours, jour courant inclus.
    const dayKey = (d: Date) => PARIS_DAY.format(d);
    const days: Array<{ day: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      days.push({ day: dayKey(new Date(Date.now() - i * 86_400_000)), count: 0 });
    }
    const byDay = new Map(days.map((d) => [d.day, d]));
    for (const p of rows) {
      const bucket = byDay.get(dayKey(new Date(p.created_at)));
      if (bucket) bucket.count += 1;
    }

    const since7 = Date.now() - 7 * 86_400_000;
    const activeUsers7d = activity.error
      ? null
      : (activity.data as Array<{ last_message_at: string | null }>).filter(
          (a) => a.last_message_at && new Date(a.last_message_at).getTime() >= since7
        ).length;

    return ok({
      totalUsers: rows.length,
      usersWithAccess: withAccess.length,
      pastDue: states.filter((s) => s.state === "past_due").length,
      expired: states.filter((s) => s.state === "expired").length,
      neverSubscribed: states.filter((s) => s.state === "none" && s.profile.role !== "admin").length,
      accessBySource: bySource,
      usersToday: days[days.length - 1].count,
      signups30d: days.reduce((sum, d) => sum + d.count, 0),
      signupsByDay: days,
      activeUsers7d,
      totalConversations: conversations.count ?? 0,
      totalMessages: messages.count ?? 0,
    });
  } catch (error) {
    return failFrom(error, "métriques");
  }
}
