"use client";

import { useEffect, useState } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/chat";

export function ChatPageClient({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pillarId, setPillarId] = useState<string | undefined>();
  const [pillarName, setPillarName] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();

        const { data: conv, error: convError } = await supabase
          .from("conversations")
          .select("pillar_id, pillars(name)")
          .eq("id", conversationId)
          .single();

        if (convError) {
          console.error("Error loading conversation:", convError);
        } else if (conv?.pillar_id) {
          setPillarId(conv.pillar_id);
          const pillar = (conv as Record<string, unknown>).pillars as { name: string } | null;
          setPillarName(pillar?.name);
        } else {
          setPillarName("Global");
        }

        const { data: msgs, error: msgsError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (msgsError) {
          console.error("Error loading messages:", msgsError);
        }

        setMessages(msgs || []);
      } catch (err) {
        console.error("Unexpected error loading conversation:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [conversationId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <ChatInterface
      conversationId={conversationId}
      pillarId={pillarId}
      pillarName={pillarName}
      initialMessages={messages}
    />
  );
}
