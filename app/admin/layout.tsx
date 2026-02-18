import { Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthButton } from "@/components/auth-button";
import { AdminSidebar } from "./admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <header className="border-b bg-muted/50">
          <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Lya</h1>
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                Admin
              </span>
            </div>
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </header>
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
