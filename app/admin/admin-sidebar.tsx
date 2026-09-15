"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, LogOut, ArrowLeft, User, Sun, Moon, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND_SHORT } from "@/lib/brand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function LyaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="4" fill="currentColor" />
      <path d="M14 10 C14 10, 8 4, 5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Utilisateurs",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Configuration IA",
    href: "/admin/ai",
    icon: LyaIcon,
  },
  {
    label: "Documentation",
    href: "/admin/documentation",
    icon: BookOpen,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, profile } = useAuth();

  return (
    <aside className="w-64 border-r bg-muted/30 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-6">
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
        <span className="text-lg font-semibold tracking-tight text-foreground/90">{BRAND_SHORT}</span>
        <span className="text-xs bg-golf text-golf-foreground px-2 py-0.5 rounded-full font-medium">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-golf text-golf-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

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
                <div className="h-8 w-8 rounded-full bg-golf text-golf-foreground flex items-center justify-center text-xs font-medium shrink-0">
                  {(profile?.first_name || user?.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile?.first_name || user?.email || "Administrateur"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  Head Coach
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => router.push("/admin/informations")}>
              <User className="h-4 w-4 mr-2" />
              Informations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voir l&apos;app
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
