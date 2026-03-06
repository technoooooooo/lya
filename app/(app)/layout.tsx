import { AuthProvider } from "@/contexts/AuthContext";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { PWAInstallPrompt } from "@/components/shared/PWAInstallPrompt";
import { AdminViewBanner } from "@/components/shared/AdminViewBanner";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    profile = data as Profile | null;
  }

  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
      <div className="h-screen flex flex-col">
        <AdminViewBanner />
        <div className="flex flex-1 min-h-0">
          <ChatSidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
          <PWAInstallPrompt />
        </div>
      </div>
    </AuthProvider>
  );
}
