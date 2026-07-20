import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { VideoLinkCards } from "./VideoLinkCards";
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
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Les liens s'ouvrent dans un nouvel onglet pour ne pas quitter
                // la conversation en cours. Les URLs brutes (autolinks) sont
                // affichées sous un libellé compact — l'URL YouTube complète
                // casse la mise en page et la vignette est déjà sous le message.
                a: ({ href, children }) => {
                  const isBareUrl = String(children) === href;
                  let label: React.ReactNode = children;
                  if (isBareUrl && href) {
                    try {
                      const { hostname } = new URL(href);
                      label = /(^|\.)youtu(\.be|be\.com)$/.test(hostname)
                        ? "Voir la vidéo"
                        : hostname;
                    } catch {
                      // URL invalide : on garde le texte d'origine
                    }
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {label}
                    </a>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
            <VideoLinkCards content={content} />
          </>
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
