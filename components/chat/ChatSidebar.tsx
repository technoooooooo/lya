"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Plus, Sun, Moon, User, Settings, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conversation } from "@/types/chat";

export function ChatSidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, profile } = useAuth();

  useEffect(() => {
    const fetchConversations = async () => {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
      setIsLoading(false);
    };

    fetchConversations();
  }, [pathname]);

  // Collapsed state: just a toggle button
  if (!isOpen) {
    return (
      <div className="flex flex-col items-center py-4 px-2 border-r bg-muted/30">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Ouvrir la sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 border-r bg-muted/30 flex flex-col h-full">
      {/* Header: logo + toggle */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href="/" className="flex items-center gap-2.5">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" className="text-foreground/70" />
            <circle cx="14" cy="14" r="4" fill="currentColor" className="text-foreground/70" />
            <path d="M14 10 C14 10, 8 4, 5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-foreground/40" />
          </svg>
          <span className="text-lg font-semibold tracking-tight text-foreground/90">Lya</span>
        </Link>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Fermer la sidebar"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      {/* Coach card */}
      <div className="mx-3 mb-4 rounded-lg bg-muted/60 border border-border/50 p-3 flex items-center gap-3">
        <img
          src="/images/mathieu.jpg"
          alt="Mathieu"
          className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-green-500/30"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Ton coach</p>
          <p className="text-[13px] font-semibold text-foreground truncate leading-tight mt-0.5">Mathieu Lamote</p>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 pb-2">
        <Link href="/">
          <Button className="w-full justify-start gap-2 bg-golf text-golf-foreground hover:bg-golf/90">
            <Plus className="h-4 w-4" />
            Nouveau chat
          </Button>
        </Link>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground p-2">Chargement...</p>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">Aucune conversation</p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className={cn(
                  "flex flex-col gap-1 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                  pathname === `/chat/${conv.id}` && "bg-muted"
                )}
              >
                <span className="truncate">
                  {conv.title || "Nouvelle conversation"}
                </span>
                <span className={cn(
                  "inline-flex self-start items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight",
                  conv.pillar_name
                    ? "bg-muted-foreground/15 text-muted-foreground"
                    : "bg-golf/15 text-golf"
                )}>
                  {conv.pillar_name || "Global"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="p-3 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full rounded-lg px-2 py-2 text-sm hover:bg-muted transition-colors text-left">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">
                  {(profile?.first_name || user?.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile?.first_name || user?.email || "Utilisateur"}
                </div>
                {(profile?.golf_club || profile?.role === "admin") && (
                  <div className="truncate text-xs text-muted-foreground">
                    {profile?.role === "admin" ? "Head Coach" : profile?.golf_club}
                  </div>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => router.push("/informations")}>
              <User className="h-4 w-4 mr-2" />
              Informations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/account")}>
              <Settings className="h-4 w-4 mr-2" />
              Compte
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4 mr-2" />
                  Mode clair
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 mr-2" />
                  Mode sombre
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                fetch("/auth/signout", { method: "POST" }).finally(() => {
                  window.location.href = "/auth/login";
                });
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
