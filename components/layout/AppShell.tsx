"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, SquarePen } from "lucide-react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { PWAInstallPrompt } from "@/components/shared/PWAInstallPrompt";
import { AdminViewBanner } from "@/components/shared/AdminViewBanner";
import { AccessBanner } from "@/components/billing/AccessBanner";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { BRAND_SHORT } from "@/lib/brand";
import { AppShellContext, useAppShell } from "@/contexts/AppShellContext";

/**
 * Cale la hauteur de l'app sur le viewport *visible*.
 *
 * Sur iOS, le clavier ne redimensionne pas la page : il la recouvre, et Safari
 * fait défiler tout le document pour garder le champ visible — l'en-tête
 * disparaît et la zone de saisie « saute ». En suivant `visualViewport`, la
 * coque de l'app se réduit à la place laissée par le clavier : l'en-tête reste,
 * la liste des messages rétrécit, le champ reste collé au-dessus du clavier
 * (comportement de l'app ChatGPT). Sans `visualViewport`, on retombe sur
 * `100dvh`.
 */
function useVisualViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;

    const clear = () => {
      root.style.removeProperty("--vv-height");
      root.style.removeProperty("--vv-top");
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Zoom au pincement : on ne suit pas, sinon l'app se recadrerait sur
        // la zone zoomée.
        if (Math.abs(vv.scale - 1) > 0.01) {
          clear();
          return;
        }
        root.style.setProperty("--vv-height", `${Math.round(vv.height)}px`);
        root.style.setProperty("--vv-top", `${Math.max(0, Math.round(vv.offsetTop))}px`);
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      clear();
    };
  }, []);
}

function MobileHeader({ content }: { content: ReactNode | null }) {
  const { openDrawer } = useAppShell();

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b px-1.5 md:hidden">
      <button
        type="button"
        onClick={openDrawer}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {content ?? (
          <Link href="/" className="flex min-w-0 items-center gap-2 px-1">
            <BrandLogo size={24} />
            <span className="truncate text-base font-semibold tracking-tight">
              {BRAND_SHORT}
            </span>
          </Link>
        )}
      </div>
      <Link
        href="/"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Nouveau chat"
      >
        <SquarePen className="h-5 w-5" />
      </Link>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileHeader, setMobileHeaderState] = useState<ReactNode | null>(null);

  useVisualViewportVars();

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const setMobileHeader = useCallback(
    (node: ReactNode | null) => setMobileHeaderState(node),
    []
  );

  const value = useMemo(
    () => ({ isDrawerOpen, openDrawer, closeDrawer, setMobileHeader }),
    [isDrawerOpen, openDrawer, closeDrawer, setMobileHeader]
  );

  return (
    <AppShellContext.Provider value={value}>
      {/* `fixed` + hauteur du viewport visible : le document lui-même ne
          défile jamais, seule la liste des messages défile. */}
      <div className="fixed inset-x-0 top-[var(--vv-top,0px)] flex h-[var(--vv-height,100dvh)] flex-col overflow-hidden bg-background">
        <AdminViewBanner />
        <AccessBanner />
        <div className="flex min-h-0 flex-1">
          <ChatSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileHeader content={mobileHeader} />
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              {children}
            </main>
          </div>
        </div>
        <PWAInstallPrompt />
      </div>
    </AppShellContext.Provider>
  );
}
