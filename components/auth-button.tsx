"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function AuthButton() {
  const { user, isLoading } = useAuth();

  const logout = () => {
    // POST to signout API then redirect — avoids client-side Supabase issues
    fetch("/auth/signout", { method: "POST" }).finally(() => {
      window.location.href = "/auth/login";
    });
  };

  return (
    <div className="flex items-center gap-4">
      {!isLoading && user && (
        <Link href="/account" className="text-sm text-muted-foreground hover:underline">
          {user.email}
        </Link>
      )}
      <Button onClick={logout} variant="outline" size="sm">
        Déconnexion
      </Button>
    </div>
  );
}
