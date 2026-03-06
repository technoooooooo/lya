import { cn } from "@/lib/utils";
import type { MessageRole } from "@/types/chat";

interface ChatMessageProps {
  role: MessageRole;
  content: string;
  userAvatarUrl?: string | null;
}

export function ChatMessage({ role, content, userAvatarUrl }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex w-full",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {role === "assistant" && (
        <img
          src="/images/mathieu.jpg"
          alt="Mathieu"
          className="h-8 w-8 rounded-full object-cover shrink-0 mr-2 mt-1"
        />
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
          role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {content}
      </div>
      {role === "user" && userAvatarUrl && (
        <img
          src={userAvatarUrl}
          alt="Vous"
          className="h-8 w-8 rounded-full object-cover shrink-0 ml-2 mt-1"
        />
      )}
    </div>
  );
}
