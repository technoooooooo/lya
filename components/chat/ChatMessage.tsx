import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
          role === "user"
            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
            : "bg-muted prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 max-w-none"
        )}
      >
        {role === "assistant" ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : (
          content
        )}
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
