"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, Brain, Dumbbell, Map, Wrench, Flag, MessageCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Pillar } from "@/types/chat";

const iconMap: Record<string, LucideIcon> = {
  target: Target,
  brain: Brain,
  dumbbell: Dumbbell,
  map: Map,
  wrench: Wrench,
  flag: Flag,
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
        "cursor-pointer transition-all hover:shadow-lg md:hover:scale-[1.02] active:scale-[0.99]",
        isGlobal ? "border-golf/50 hover:border-golf" : "hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 md:gap-4 md:p-6">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg md:h-12 md:w-12",
          isGlobal ? "bg-golf/10 text-golf" : "bg-primary/10 text-primary"
        )}>
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="text-base">{name}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}
