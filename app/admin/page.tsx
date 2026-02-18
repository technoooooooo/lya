"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, CreditCard, MessageSquare, MessagesSquare, Loader2, UserPlus } from "lucide-react";

interface MetricsData {
  totalUsers: number;
  activeSubscriptions: number;
  totalConversations: number;
  totalMessages: number;
  usersToday: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/admin/metrics");
        const json = await res.json();
        if (json.success) {
          setMetrics(json.data);
        } else {
          setError(json.error?.message ?? "Erreur inconnue");
        }
      } catch {
        setError("Erreur de connexion au serveur");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <h2 className="text-2xl font-bold mb-6">Panel d&apos;administration</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cards = [
    {
      title: "Total utilisateurs",
      value: metrics?.totalUsers ?? 0,
      icon: Users,
      description: "Comptes enregistres",
    },
    {
      title: "Abonnements actifs",
      value: metrics?.activeSubscriptions ?? 0,
      icon: CreditCard,
      description: "Utilisateurs avec abonnement actif",
    },
    {
      title: "Conversations",
      value: metrics?.totalConversations ?? 0,
      icon: MessagesSquare,
      description: "Conversations totales",
    },
    {
      title: "Messages",
      value: metrics?.totalMessages ?? 0,
      icon: MessageSquare,
      description: "Messages echanges",
    },
    {
      title: "Nouveaux aujourd'hui",
      value: metrics?.usersToday ?? 0,
      icon: UserPlus,
      description: "Inscriptions du jour",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Panel d&apos;administration</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
