"use client";

import { useEffect, useRef, useState } from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import type { Message } from "@/types/chat";

interface ChatInterfaceProps {
  conversationId?: string;
  pillarId?: string;
  pillarName?: string;
  initialMessages?: Message[];
  onConversationCreated?: (id: string) => void;
}

export function ChatInterface({
  conversationId,
  pillarId,
  pillarName,
  initialMessages = [],
  onConversationCreated,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConvId, setCurrentConvId] = useState(conversationId);
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
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
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
