"use client";

import { useEffect, useState } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import type { Message } from "@/types/chat";

export function ChatPageClient({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pillarId, setPillarId] = useState<string | undefined>();
  const [pillarName, setPillarName] = useState<string | undefined>();
  const [createdAt, setCreatedAt] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`);
        const result = await res.json();

        if (!result.success) {
          console.error("Error loading conversation:", result.error);
          return;
        }

        const { conversation, messages: msgs } = result.data;

        if (conversation.pillar_id) {
          setPillarId(conversation.pillar_id);
          setPillarName(conversation.pillar_name);
        } else {
          setPillarName("Global");
        }
        setCreatedAt(conversation.created_at);

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
      createdAt={createdAt}
      initialMessages={messages}
    />
  );
}
