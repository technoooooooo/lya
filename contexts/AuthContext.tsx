"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSubscribed: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAdmin: false,
  isSubscribed: false,
  refreshProfile: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
  initialProfile?: Profile | null;
}

export function AuthProvider({ children, initialUser = null, initialProfile = null }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  };

  const fetchProfile = async (userId: string) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) {
        console.error("fetchProfile error:", error);
      }
      setProfile(data as Profile | null);
    } catch (e) {
      console.error("fetchProfile exception:", e);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const supabase = getSupabase();

    // Ne JAMAIS appeler Supabase (ni await quoi que ce soit) dans ce callback :
    // supabase-js l'exécute à l'intérieur du verrou de session, et une requête
    // imbriquée (getSession, .from()…) attend ce même verrou → interblocage.
    // Le verrou n'est alors jamais rendu et TOUT appel auth ultérieur reste
    // suspendu (updateUser, sauvegarde du profil…). C'est ce qui se produisait
    // au TOKEN_REFRESHED : l'élève changeait son mot de passe et « ça moulinait ».
    // On se contente de synchroniser l'utilisateur ; le profil est chargé par
    // l'effet ci-dessous, hors du verrou.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (!currentUser) setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Chargement du profil, uniquement quand l'utilisateur change (pas à chaque
  // rafraîchissement de token : un refetch remettrait à zéro les formulaires
  // en cours de saisie). Le profil fourni par le serveur évite le fetch initial.
  const profileLoadedForRef = useRef<string | null>(initialProfile?.user_id ?? null);
  useEffect(() => {
    if (!user) return;
    if (profileLoadedForRef.current === user.id) {
      setIsLoading(false);
      return;
    }
    profileLoadedForRef.current = user.id;
    fetchProfile(user.id).finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isAdmin = profile?.role === "admin";
  const isSubscribed = profile?.subscription_status === "active";

  const value = useMemo(
    () => ({ user, profile, isLoading, isAdmin, isSubscribed, refreshProfile }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, profile, isLoading, isAdmin, isSubscribed]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
