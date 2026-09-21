"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // Le lien de l'email passe par /auth/callback qui pose la session en
      // cookie côté serveur, puis renvoie vers la page de nouveau mot de passe.
      // L'origine doit figurer dans les Redirect URLs du dashboard Supabase
      // (Authentication → URL Configuration), sinon Supabase retombe sur la Site URL.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Vérifiez vos emails</CardTitle>
            <CardDescription>Instructions de réinitialisation envoyées</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Si un compte existe avec cette adresse, vous recevrez un email
              pour réinitialiser votre mot de passe.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
            <CardDescription>
              Saisissez votre email et nous vous enverrons un lien pour
              réinitialiser votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
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
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button
                  type="submit"
                  className="w-full bg-golf text-golf-foreground hover:bg-golf/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Envoi..." : "Envoyer le lien"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Retour à la{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  connexion
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
