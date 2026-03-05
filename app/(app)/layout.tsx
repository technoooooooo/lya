import { AuthProvider } from "@/contexts/AuthContext";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { PWAInstallPrompt } from "@/components/shared/PWAInstallPrompt";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="h-screen flex">
        <ChatSidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <PWAInstallPrompt />
      </div>
    </AuthProvider>
  );
}
