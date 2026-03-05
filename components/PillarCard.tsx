"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, Brain, Dumbbell, Map, Wrench, MessageCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
        isGlobal ? "border-golf/50 hover:border-golf" : "hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
          isGlobal ? "bg-golf/10 text-golf" : "bg-primary/10 text-primary"
        )}>
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
