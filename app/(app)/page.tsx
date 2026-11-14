"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PillarCard } from "@/components/PillarCard";
import type { Pillar } from "@/types/chat";

export default function HomePage() {
  const { profile } = useAuth();
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    async function fetchPillars() {
      try {
        const response = await fetch("/api/pillars");
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setPillars(result.data);
          }
        }
      } catch (error) {
        console.error("Erreur chargement des piliers:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPillars();
  }, []);

  const handlePillarClick = (pillarId: string | null) => {
    setSelectedPillarId(pillarId);
    setShowChat(true);
  };

  const handleBack = useCallback(() => {
    setShowChat(false);
    setSelectedPillarId(null);
  }, []);

  const handleConversationCreated = (id: string) => {
    window.history.replaceState(null, "", `/chat/${id}`);
  };

  if (showChat) {
    const selectedPillar = pillars.find((p) => p.id === selectedPillarId);
    return (
      <ChatInterface
        pillarId={selectedPillarId || undefined}
        pillarName={selectedPillar?.name || (selectedPillarId ? undefined : "Global")}
        onConversationCreated={handleConversationCreated}
        onBack={handleBack}
      />
    );
  }

  return (
    // min-h-full (et non h-full) : sur mobile la grille dépasse la hauteur de
    // l'écran, un centrage sur une hauteur fixe en couperait le haut.
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 md:p-6">
      <div className="max-w-3xl w-full space-y-6 md:space-y-8">
        <div className="text-center space-y-2 md:space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/mathieu.jpg"
            alt="Mathieu"
            className="h-16 w-16 rounded-full object-cover mx-auto md:h-24 md:w-24"
          />
          <h1 className="text-2xl font-bold md:text-3xl">
            Bonjour{profile?.first_name ? `, ${profile.first_name}` : ""}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Choisissez un pilier pour commencer une conversation ciblée.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 md:h-28 rounded-xl border bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {pillars.map((pillar) => (
              <PillarCard
                key={pillar.id}
                pillar={pillar}
                onClick={() => handlePillarClick(pillar.id)}
              />
            ))}
            <PillarCard isGlobal onClick={() => handlePillarClick(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
