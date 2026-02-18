"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, Brain, Dumbbell, Map, Wrench, MessageCircle, type LucideIcon } from "lucide-react";
import type { Pillar } from "@/types/chat";

const iconMap: Record<string, LucideIcon> = {
  target: Target,
  brain: Brain,
  dumbbell: Dumbbell,
  map: Map,
  wrench: Wrench,
  "message-circle": MessageCircle,
};

interface PillarCardProps {
  pillar?: Pillar;
  isGlobal?: boolean;
  onClick: () => void;
}

export function PillarCard({ pillar, isGlobal = false, onClick }: PillarCardProps) {
  const iconName = isGlobal ? "message-circle" : (pillar?.icon || "target");
  const Icon = iconMap[iconName] || Target;
  const name = isGlobal ? "Mode Global" : pillar?.name;
  const description = isGlobal
    ? "Posez vos questions générales sur le golf, sans thème spécifique."
    : pillar?.description;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-1">
          <CardTitle className="text-base">{name}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}
