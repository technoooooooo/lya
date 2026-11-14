"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, ArrowRight } from "lucide-react";

export function AdminViewBanner() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <div className="bg-golf text-golf-foreground px-3 py-1.5 flex items-center justify-between gap-3 text-xs sm:px-4 sm:py-2 sm:text-sm">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="font-medium">Vue utilisateur</span>
      </div>
      <Link
        href="/admin"
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 font-medium transition-colors hover:bg-white/30"
      >
        Retour à l&apos;admin
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
