"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, ArrowRight } from "lucide-react";

export function AdminViewBanner() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <div className="bg-golf text-golf-foreground px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="font-medium">Vue utilisateur</span>
      </div>
      <Link
        href="/admin"
        className="flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 text-sm font-medium transition-colors hover:bg-white/30"
      >
        Retour à l&apos;admin
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
