"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PillarCard } from "@/components/PillarCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Pillar } from "@/types/chat";

export default function HomePage() {
  const router = useRouter();
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

  const handleBack = () => {
    setShowChat(false);
    setSelectedPillarId(null);
  };

  const handleConversationCreated = (id: string) => {
    window.history.replaceState(null, "", `/chat/${id}`);
  };

  if (showChat) {
    const selectedPillar = pillars.find((p) => p.id === selectedPillarId);
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour aux piliers
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedPillar?.name || "Mode Global"}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            pillarId={selectedPillarId || undefined}
            pillarName={selectedPillar?.name || (selectedPillarId ? undefined : "Global")}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-4">
          <img
            src="/images/mathieu.jpg"
            alt="Mathieu"
            className="h-24 w-24 rounded-full object-cover mx-auto"
          />
          <h1 className="text-3xl font-bold">
            Bonjour{profile?.first_name ? `, ${profile.first_name}` : ""}
          </h1>
          <p className="text-muted-foreground text-lg">
            Choisissez un pilier pour commencer une conversation ciblée.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl border bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
