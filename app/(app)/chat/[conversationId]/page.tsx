import { Suspense } from "react";
import { ChatPageClient } from "./client";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center h-full">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      }
    >
      <ChatPageClient conversationId={conversationId} />
    </Suspense>
  );
}
