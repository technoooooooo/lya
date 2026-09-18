"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { BrandLogo } from "@/components/shared/BrandLogo";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Les mots de passe ne correspondent pas");
      setIsLoading(false);
      return;
    }

    // If promo code provided, validate it first
    if (promoCode.trim()) {
      try {
        const res = await fetch("/api/promo/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: promoCode.trim() }),
        });
        const result = await res.json();
        if (!result.success) {
          setError(result.error.message);
          setIsLoading(false);
          return;
        }
      } catch {
        setError("Impossible de vérifier le code promo");
        setIsLoading(false);
        return;
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });
      if (error) throw error;

      // If promo code provided and signup succeeded, apply it
      if (promoCode.trim() && data.user) {
        await fetch("/api/promo/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: promoCode.trim(),
            userId: data.user.id,
          }),
        });
      }

      router.push("/auth/signup/success");
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
        <BrandLogo size={96} className="rounded-2xl shadow-sm" />
        <h1 className="sr-only">{BRAND_NAME}</h1>
        <p className="text-sm text-muted-foreground">Créez votre compte</p>
      </div>

      {/* Form */}
      <div className="w-full rounded-2xl border bg-card p-6 shadow-sm">
        <form onSubmit={handleSignUp}>
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Votre prénom"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Votre nom"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
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
              <Label htmlFor="password">Mot de passe</Label>
              <PasswordInput
                id="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repeat-password">Confirmer le mot de passe</Label>
              <PasswordInput
                id="repeat-password"
                required
                autoComplete="new-password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-code">
                Code promo <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Input
                id="promo-code"
                type="text"
                placeholder="Entrez votre code promo"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-golf text-golf-foreground hover:bg-golf/90"
              disabled={isLoading}
            >
              {isLoading ? "Création du compte..." : "S'inscrire"}
            </Button>
          </div>
        </form>
      </div>

      <p className="text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/auth/login" className="text-golf hover:underline font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
