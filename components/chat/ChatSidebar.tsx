"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShell } from "@/contexts/AppShellContext";
import { cn } from "@/lib/utils";
import { Plus, Sun, Moon, User, LogOut, PanelLeftClose, PanelLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conversation } from "@/types/chat";
import { BRAND_SHORT } from "@/lib/brand";
import { BrandLogo } from "@/components/shared/BrandLogo";

interface SidebarContentProps {
  conversations: Conversation[];
  isLoading: boolean;
  pathname: string;
  variant: "desktop" | "mobile";
  onClose: () => void;
  /** Appelé à chaque navigation depuis la sidebar (ferme le tiroir mobile). */
  onNavigate: () => void;
}

function SidebarContent({
  conversations,
  isLoading,
  pathname,
  variant,
  onClose,
  onNavigate,
}: SidebarContentProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, profile } = useAuth();
  const isMobile = variant === "mobile";

  return (
    <>
      {/* Header: logo + toggle */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <BrandLogo size={28} />
          <span className="text-lg font-semibold tracking-tight text-foreground/90">{BRAND_SHORT}</span>
        </Link>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label={isMobile ? "Fermer le menu" : "Fermer la sidebar"}
        >
          {isMobile ? <X className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {/* Coach card */}
      <div className="mx-3 mb-4 rounded-lg bg-muted/60 border border-border/50 p-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <Button
          asChild
          className="w-full justify-start gap-2 bg-golf text-golf-foreground hover:bg-golf/90 h-10"
        >
          <Link href="/" onClick={onNavigate}>
            <Plus className="h-4 w-4" />
            Nouveau chat
          </Link>
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
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
                onClick={onNavigate}
                className={cn(
                  "flex flex-col gap-1 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                  isMobile && "py-2.5",
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
      <div className="p-3 border-t pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full rounded-lg px-2 py-2 text-sm hover:bg-muted transition-colors text-left">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
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
            <DropdownMenuItem
              onClick={() => {
                onNavigate();
                router.push("/account");
              }}
            >
              <User className="h-4 w-4 mr-2" />
              Mon compte
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
    </>
  );
}

/**
 * Navigation de l'app.
 *  - desktop (≥ md) : colonne latérale repliable, comme avant ;
 *  - mobile : tiroir plein écran ouvert depuis le bouton menu de la barre du
 *    haut — la sidebar ne prend plus aucune largeur à côté du chat.
 */
export function ChatSidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const { isDrawerOpen, closeDrawer } = useAppShell();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        if (data.success) {
          setConversations(data.data);
        }
      } catch {
        // réseau coupé (sur le parcours…) : on garde la liste déjà affichée
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [pathname]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  const shared = { conversations, isLoading, pathname };

  return (
    <>
      {/* Desktop */}
      {isOpen ? (
        <aside className="hidden md:flex w-64 shrink-0 border-r bg-muted/30 flex-col h-full">
          <SidebarContent
            {...shared}
            variant="desktop"
            onClose={() => setIsOpen(false)}
            onNavigate={() => {}}
          />
        </aside>
      ) : (
        <div className="hidden md:flex flex-col items-center py-4 px-2 border-r bg-muted/30">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Ouvrir la sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Mobile : tiroir */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden",
          isDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-[320px] flex-col border-r bg-background pt-[env(safe-area-inset-top)] shadow-xl transition-transform duration-200 ease-out md:hidden",
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Menu"
        aria-hidden={!isDrawerOpen}
        inert={!isDrawerOpen}
      >
        <SidebarContent
          {...shared}
          variant="mobile"
          onClose={closeDrawer}
          onNavigate={closeDrawer}
        />
      </aside>
    </>
  );
}
