"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import type { Message } from "@/types/chat";

interface ChatInterfaceProps {
  conversationId?: string;
  pillarId?: string;
  pillarName?: string;
  createdAt?: string;
  initialMessages?: Message[];
  onConversationCreated?: (id: string) => void;
}

export function ChatInterface({
  conversationId,
  pillarId,
  pillarName,
  createdAt,
  initialMessages = [],
  onConversationCreated,
}: ChatInterfaceProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConvId, setCurrentConvId] = useState(conversationId);
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = async (message: string) => {
    // Optimistic add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: currentConvId || "",
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentConvId,
          message,
          pillarId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Erreur");
      }

      // Get conversation ID from header (for new conversations)
      const newConvId = response.headers.get("X-Conversation-Id");
      if (newConvId && !currentConvId) {
        setCurrentConvId(newConvId);
        onConversationCreated?.(newConvId);
      }

      // Read stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: currentConvId || newConvId || "",
        role: "assistant",
        content: fullContent,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: currentConvId || "",
        role: "assistant",
        content: "Désolé, une erreur est survenue. Veuillez réessayer.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStreamingContent("");
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
            pillarName && pillarName !== "Global"
              ? "bg-muted-foreground/15 text-muted-foreground"
              : "bg-golf/15 text-golf"
          )}>
            {pillarName || "Global"}
          </span>
          {createdAt && (
            <span className="text-xs text-muted-foreground">
              Conversation débutée le {new Date(createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
        </div>
        {currentConvId && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Supprimer la conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xs text-center [&>button:last-child]:hidden">
              <DialogHeader className="text-center sm:text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <DialogTitle className="text-center">
                  Supprimer la conversation
                </DialogTitle>
                <DialogDescription className="text-center">
                  Cette action est irréversible. Tous les messages seront définitivement supprimés.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row gap-2 sm:justify-center">
                <DialogClose asChild>
                  <Button variant="outline" className="flex-1">
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    const res = await fetch(`/api/conversations/${currentConvId}`, { method: "DELETE" });
                    const result = await res.json();
                    if (result.success) {
                      router.push("/");
                    }
                    setIsDeleting(false);
                  }}
                >
                  {isDeleting ? "Suppression..." : "Supprimer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} userAvatarUrl={profile?.avatar_url} />
          ))}
          {isStreaming && streamingContent && (
            <ChatMessage role="assistant" content={streamingContent} />
          )}
          {isStreaming && !streamingContent && <TypingIndicator />}
          <div ref={scrollRef} />
        </div>
      </div>
      <ChatInput onSend={handleSend} isStreaming={isStreaming} />
    </div>
  );
}
