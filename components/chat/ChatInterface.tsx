"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowLeft, Trash2 } from "lucide-react";
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
import { useAppShell } from "@/contexts/AppShellContext";
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
  /** Retour à la grille des piliers (conversation pas encore enregistrée). */
  onBack?: () => void;
}

function PillarBadge({ name }: { name?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center rounded-full px-2.5 py-1 text-xs font-medium",
        name && name !== "Global"
          ? "bg-muted-foreground/15 text-muted-foreground"
          : "bg-golf/15 text-golf"
      )}
    >
      <span className="truncate">{name || "Global"}</span>
    </span>
  );
}

function DeleteConversationButton({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:h-8 md:w-8"
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
              const res = await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
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
  );
}

export function ChatInterface({
  conversationId,
  pillarId,
  pillarName,
  createdAt,
  initialMessages = [],
  onConversationCreated,
  onBack,
}: ChatInterfaceProps) {
  const { profile } = useAuth();
  const { setMobileHeader } = useAppShell();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConvId, setCurrentConvId] = useState(conversationId);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Tant que l'utilisateur est en bas, on suit la génération ; s'il remonte
  // pour lire, on arrête de le ramener en bas à chaque nouveau morceau.
  const pinnedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    // Défilement instantané : un défilement animé émet des événements
    // intermédiaires (« pas en bas ») et s'arrête court si le contenu grandit
    // pendant l'animation — la vue décrochait du bas après une réponse.
    if (pinnedRef.current) scrollToBottom();
  }, [messages, streamingContent, isStreaming]);

  // La zone visible change de taille sans aucun événement de défilement :
  // clavier mobile qui s'ouvre, champ de saisie qui grandit, images et
  // vignettes vidéo qui se chargent. Si on était en bas, on y reste.
  useEffect(() => {
    const el = containerRef.current;
    const content = el?.firstElementChild;
    if (!el || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) scrollToBottom();
    });
    observer.observe(el);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  // Sur mobile, le pilier et les actions de la conversation vont dans la barre
  // du haut de l'app (une seule barre au lieu de deux).
  useEffect(() => {
    setMobileHeader(
      <>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Retour aux piliers"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex min-w-0 flex-1 px-1">
          <PillarBadge name={pillarName} />
        </div>
        {currentConvId && <DeleteConversationButton conversationId={currentConvId} />}
      </>
    );
  }, [setMobileHeader, onBack, pillarName, currentConvId]);

  useEffect(() => () => setMobileHeader(null), [setMobileHeader]);

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
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
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
      <div className="hidden md:flex items-center justify-between gap-3 px-4 py-2.5 border-b shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 shrink-0">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour aux piliers
            </Button>
          )}
          <PillarBadge name={pillarName} />
          {createdAt && (
            <span className="truncate text-xs text-muted-foreground">
              Conversation débutée le {new Date(createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
        </div>
        {currentConvId && <DeleteConversationButton conversationId={currentConvId} />}
      </div>
      <div className="relative flex-1 min-h-0">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 md:p-4"
        >
          <div className="max-w-3xl mx-auto space-y-4 min-w-0">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} role={msg.role} content={msg.content} userAvatarUrl={profile?.avatar_url} />
            ))}
            {isStreaming && streamingContent && (
              <ChatMessage role="assistant" content={streamingContent} />
            )}
            {isStreaming && !streamingContent && <TypingIndicator />}
          </div>
        </div>
        {showJumpButton && (
          <button
            onClick={jumpToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border bg-background px-3.5 py-2 text-xs shadow-md transition-colors hover:bg-muted"
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
