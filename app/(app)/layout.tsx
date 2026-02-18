import { Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthButton } from "@/components/auth-button";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { PWAInstallPrompt } from "@/components/shared/PWAInstallPrompt";
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="h-screen flex flex-col">
        <header className="border-b shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="text-xl font-bold">
              Lya
            </Link>
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <Suspense>
            <ChatSidebar />
          </Suspense>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <PWAInstallPrompt />
      </div>
    </AuthProvider>
  );
}
