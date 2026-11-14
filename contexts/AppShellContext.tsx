"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface AppShellContextValue {
  /** Tiroir de navigation mobile (la sidebar desktop a son propre état). */
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /**
   * Contenu de la barre du haut sur mobile. La conversation y place son pilier
   * et ses actions plutôt que d'empiler une seconde barre : sur un iPhone SE
   * chaque ligne retirée au-dessus du chat est de la place rendue aux messages.
   */
  setMobileHeader: (node: ReactNode | null) => void;
}

export const AppShellContext = createContext<AppShellContextValue | null>(null);

const noop = () => {};
const fallback: AppShellContextValue = {
  isDrawerOpen: false,
  openDrawer: noop,
  closeDrawer: noop,
  setMobileHeader: noop,
};

export function useAppShell(): AppShellContextValue {
  return useContext(AppShellContext) ?? fallback;
}
