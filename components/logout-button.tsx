"use client";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const logout = () => {
    fetch("/auth/signout", { method: "POST" }).finally(() => {
      window.location.href = "/auth/login";
    });
  };

  return <Button onClick={logout}>Déconnexion</Button>;
}
