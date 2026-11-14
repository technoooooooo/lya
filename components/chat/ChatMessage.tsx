import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoLinkCards } from "./VideoLinkCards";
import { parseAttachments } from "@/lib/chat/attachments";
import type { MessageRole } from "@/types/chat";

interface ChatMessageProps {
  role: MessageRole;
  content: string;
  userAvatarUrl?: string | null;
}

// Bulle utilisateur : le texte est affiché tel quel, les pièces jointes
// (référencées en markdown dans le contenu) sont rendues en vignettes/chips.
function UserMessageContent({ content }: { content: string }) {
  const { text, images, docs } = parseAttachments(content);

  if (images.length === 0 && docs.length === 0) {
    return <>{content}</>;
  }

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image) => (
            <a key={image.url} href={image.url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.name}
                loading="lazy"
                className="h-32 w-auto max-w-full rounded-lg object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {docs.map((doc) => (
        <a
          key={doc.url}
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex max-w-full w-fit items-center gap-2 rounded-lg bg-primary-foreground/15 px-3 py-2 text-xs underline-offset-2 hover:underline"
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{doc.name}</span>
        </a>
      ))}
      {text && <div>{text}</div>}
    </div>
  );
}

export function ChatMessage({ role, content, userAvatarUrl }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {role === "assistant" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/mathieu.jpg"
          alt="Mathieu"
          className="hidden sm:block h-8 w-8 rounded-full object-cover shrink-0 mr-2 mt-1"
        />
      )}
      <div
        className={cn(
          // min-w-0 + césure des mots : sans eux, une URL ou un tableau large
          // élargit la bulle au-delà de l'écran (scroll horizontal sur mobile).
          "min-w-0 rounded-2xl py-3 text-sm break-words",
          role === "user"
            ? "max-w-[85%] sm:max-w-[80%] px-4 bg-primary text-primary-foreground whitespace-pre-wrap"
            : "flex-1 sm:flex-initial px-3.5 sm:px-4 bg-muted prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:max-w-full prose-pre:overflow-x-auto max-w-none"
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
                // Les tableaux défilent dans leur propre cadre plutôt que
                // d'élargir toute la page.
                table: ({ children }) => (
                  <div className="my-2 max-w-full overflow-x-auto">
                    <table className="my-0">{children}</table>
                  </div>
                ),
                // Photos de la base de connaissances insérées par l'IA.
                img: ({ src, alt }) => {
                  const url = typeof src === "string" ? src : undefined;
                  if (!url) return null;
                  return (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={alt ?? ""}
                        loading="lazy"
                        className="my-2 max-h-80 w-auto max-w-full rounded-lg border"
                      />
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
          <UserMessageContent content={content} />
        )}
      </div>
      {role === "user" && userAvatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={userAvatarUrl}
          alt="Vous"
          className="hidden sm:block h-8 w-8 rounded-full object-cover shrink-0 ml-2 mt-1"
        />
      )}
    </div>
  );
}
