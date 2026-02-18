"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/types/chat";

export function ChatSidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const fetchConversations = async () => {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
      setIsLoading(false);
    };

    fetchConversations();
  }, [pathname]);

  return (
    <aside className="w-64 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-3">
        <Link href="/">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            Nouveau chat
          </Button>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground p-2">Chargement...</p>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">Aucune conversation</p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                  pathname === `/chat/${conv.id}` && "bg-muted"
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {conv.title || "Nouvelle conversation"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
