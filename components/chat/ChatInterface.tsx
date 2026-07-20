"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ArrowDown, Trash2 } from "lucide-react";
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

// Erreur renvoyée par l'API chat avec un message destiné à l'utilisateur —
// à distinguer des erreurs techniques (réseau, stream) qu'on ne montre pas.
class ChatApiError extends Error {}

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
  const [showJumpButton, setShowJumpButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Tant que l'utilisateur est en bas, on suit la génération ; s'il remonte
  // pour lire, on arrête de le ramener en bas à chaque nouveau morceau.
  const pinnedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (pinnedRef.current) {
      scrollRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
    }
  }, [messages, streamingContent, isStreaming]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const pinned = distanceFromBottom < 80;
    pinnedRef.current = pinned;
    setShowJumpButton(!pinned);
  };

  const jumpToBottom = () => {
    pinnedRef.current = true;
    setShowJumpButton(false);
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

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
    // Un envoi ramène toujours la vue en bas, sur le nouveau message.
    pinnedRef.current = true;
    setShowJumpButton(false);

    const controller = new AbortController();
    abortRef.current = controller;
    let fullContent = "";

    const pushAssistantMessage = (content: string, convId: string) => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: convId,
        role: "assistant",
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentConvId,
          message,
          pillarId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new ChatApiError(
          payload?.error?.message || "Une erreur est survenue côté serveur."
        );
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      pushAssistantMessage(fullContent, currentConvId || newConvId || "");
    } catch (error) {
      if (controller.signal.aborted) {
        // Stop volontaire : on garde le début de réponse déjà reçu (le serveur
        // sauvegarde le même partiel de son côté).
        if (fullContent) {
          pushAssistantMessage(fullContent, currentConvId || "");
        } else {
          setStreamingContent("");
        }
      } else {
        console.error("Chat error:", error);
        // Le message de l'API (limite de longueur, abonnement, rate limit…) est
        // affiché tel quel : un texte générique masquerait la cause réelle.
        pushAssistantMessage(
          error instanceof ChatApiError
            ? error.message
            : "Désolé, une erreur est survenue. Veuillez réessayer.",
          currentConvId || ""
        );
      }
    } finally {
      abortRef.current = null;
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
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto p-4">
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
        {showJumpButton && (
          <button
            onClick={jumpToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs shadow-md transition-colors hover:bg-muted"
            aria-label="Revenir en bas de la conversation"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Revenir en bas
          </button>
        )}
      </div>
      <ChatInput onSend={handleSend} onStop={handleStop} isStreaming={isStreaming} />
    </div>
  );
}
