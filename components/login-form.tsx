"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND_NAME } from "@/lib/brand";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      router.push(profile?.role === "admin" ? "/admin" : "/");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-8", className)} {...props}>
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <svg
          width="48"
          height="48"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="14" cy="14" r="13" stroke="hsl(153 51% 30%)" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="4" fill="hsl(153 51% 30%)" />
          <path d="M14 10 C14 10, 8 4, 5 7" stroke="hsl(153 51% 30%)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
        <h1 className="text-2xl font-semibold tracking-tight">{BRAND_NAME}</h1>
        <p className="text-sm text-muted-foreground">Votre assistant golf personnel</p>
      </div>

      {/* Form */}
      <div className="w-full rounded-2xl border bg-card p-6 shadow-sm">
        <form onSubmit={handleLogin}>
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  href="/auth/forgot-password"
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-golf text-golf-foreground hover:bg-golf/90"
              disabled={isLoading}
            >
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </div>
        </form>
      </div>

      <p className="text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/auth/signup" className="text-golf hover:underline font-medium">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
