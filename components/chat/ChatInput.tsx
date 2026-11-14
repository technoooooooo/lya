"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import {
  ArrowUp,
  Check,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  Square,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { MAX_MESSAGE_LENGTH } from "@/lib/validations/chat";
import {
  imageAttachmentMarkdown,
  docAttachmentMarkdown,
} from "@/lib/chat/attachments";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

interface PendingAttachment {
  url: string;
  name: string;
  kind: "image" | "document";
}

// Seuil d'affichage du compteur : inutile de l'afficher sur un message
// ordinaire, il n'apparaît qu'à l'approche de la limite (long texte collé).
const COUNTER_THRESHOLD = Math.floor(MAX_MESSAGE_LENGTH * 0.8);

const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf";

const ICON_BUTTON =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function joinText(current: string, addition: string): string {
  const base = current.trimEnd();
  return base ? `${base} ${addition}` : addition;
}

// Écran tactile (téléphone, tablette) : pas de touche Maj pour aller à la
// ligne, et un focus programmatique y ferait surgir le clavier par-dessus la
// réponse qu'on veut lire.
function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

export function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Dictée terminée par « envoyer » : la transcription part directement à
  // l'IA, sans passer par le champ de saisie.
  const autoSendRef = useRef(false);

  const {
    isRecording,
    recordingSeconds,
    startRecording,
    stopRecording,
    cancelRecording,
    audioBlob,
  } = useVoiceRecorder();

  const isTooLong = message.length > MAX_MESSAGE_LENGTH;
  const isUploading = uploadingCount > 0;
  const isBusy = isStreaming || isTranscribing;

  /** Envoie `text` + les pièces jointes en attente. Renvoie false si refusé. */
  const send = (text: string): boolean => {
    const trimmed = text.trim();
    if (
      (!trimmed && attachments.length === 0) ||
      isStreaming ||
      isUploading ||
      text.length > MAX_MESSAGE_LENGTH
    ) {
      return false;
    }

    // Les pièces jointes sont référencées en markdown à la fin du message —
    // c'est la convention lue par le serveur et par l'affichage des bulles.
    const attachmentLines = attachments
      .map((a) =>
        a.kind === "image"
          ? imageAttachmentMarkdown(a.name, a.url)
          : docAttachmentMarkdown(a.name, a.url)
      )
      .join("\n");
    const content = [trimmed, attachmentLines].filter(Boolean).join("\n\n");

    onSend(content);
    setMessage("");
    setAttachments([]);
    if (isTouchDevice()) {
      // On ferme le clavier : la réponse doit occuper l'écran.
      textareaRef.current?.blur();
    } else {
      textareaRef.current?.focus();
    }
    return true;
  };

  // Version toujours à jour de `send` pour la suite asynchrone de la dictée.
  const sendRef = useRef(send);
  const messageRef = useRef(message);
  useEffect(() => {
    sendRef.current = send;
    messageRef.current = message;
  });

  const transcribeAudio = useCallback(async (blob: Blob): Promise<string | null> => {
    setIsTranscribing(true);
    setError(null);

    try {
      // L'extension doit refléter le conteneur réel (Safari/iOS enregistre
      // en mp4) : Whisper s'appuie dessus pour décoder le fichier.
      const extension = blob.type.includes("mp4")
        ? "mp4"
        : blob.type.includes("ogg")
          ? "ogg"
          : "webm";

      const formData = new FormData();
      formData.append("audio", blob, `audio.${extension}`);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error?.message || "Erreur de transcription");
        return null;
      }

      return (result.data.text as string | undefined)?.trim() || null;
    } catch {
      setError("Erreur de connexion au serveur");
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // Fin d'enregistrement : transcription, puis envoi direct ou insertion dans
  // le champ selon le bouton utilisé pour arrêter.
  useEffect(() => {
    if (!audioBlob) return;
    const autoSend = autoSendRef.current;
    autoSendRef.current = false;

    void (async () => {
      const text = await transcribeAudio(audioBlob);
      setIsAutoSending(false);
      if (!text) return;
      if (autoSend && sendRef.current(joinText(messageRef.current, text))) return;
      // Envoi impossible (pièce jointe encore en cours d'envoi…) : le texte
      // reste dans le champ, rien n'est perdu.
      setMessage((prev) => joinText(prev, text));
    })();
  }, [audioBlob, transcribeAudio]);

  const handleStartRecording = async () => {
    setError(null);
    try {
      await startRecording();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'accès au microphone"
      );
    }
  };

  const handleStopAndReview = () => {
    autoSendRef.current = false;
    stopRecording();
  };

  const handleStopAndSend = () => {
    autoSendRef.current = true;
    setIsAutoSending(true);
    stopRecording();
  };

  const uploadFile = async (file: File) => {
    setUploadingCount((count) => count + 1);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/chat/uploads", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error?.message || "Échec de l'envoi du fichier");
        return;
      }
      setAttachments((prev) => [
        ...prev,
        { url: result.data.url, name: result.data.name, kind: result.data.kind },
      ]);
    } catch {
      setError("Échec de l'envoi du fichier");
    } finally {
      setUploadingCount((count) => count - 1);
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => void uploadFile(file));
    e.target.value = "";
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Sur mobile, « Entrée » va à la ligne : on envoie avec le bouton.
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      !isTouchDevice()
    ) {
      e.preventDefault();
      send(message);
    }
  };

  useEffect(() => {
    if (!isBusy && !isTouchDevice()) {
      textareaRef.current?.focus();
    }
  }, [isBusy]);

  // Hauteur du champ ajustée au contenu (saisie, dictée, remise à zéro).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [message, isRecording]);

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-4 md:pt-2 md:pb-4"
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-1.5">
        {error && <p className="text-sm text-destructive px-1">{error}</p>}
        <div className="rounded-3xl border bg-muted/40 p-1.5 md:rounded-2xl md:p-2.5">
          {(attachments.length > 0 || isUploading) && (
            <div className="flex flex-wrap items-center gap-2 px-1.5 pt-1 pb-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.url}
                  className="group relative flex min-w-0 max-w-full items-center gap-2 rounded-lg border bg-background px-2 py-1.5 text-xs"
                >
                  {attachment.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="max-w-[140px] truncate">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.url)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Retirer ${attachment.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Envoi en cours…
                </div>
              )}
            </div>
          )}

          {isRecording ? (
            // Dictée en cours : une seule barre, deux sorties en un geste —
            // ↑ transcrit et envoie directement, ✓ transcrit dans le champ pour
            // relire/corriger avant d'envoyer. ✕ abandonne.
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cancelRecording}
                className={ICON_BUTTON}
                aria-label="Annuler la dictée"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2 px-1 text-sm">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                </span>
                <span className="tabular-nums font-medium text-destructive">
                  {formatDuration(recordingSeconds)}
                </span>
                <span className="truncate text-muted-foreground">Je vous écoute…</span>
              </div>
              <button
                type="button"
                onClick={handleStopAndReview}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background text-foreground transition-colors hover:bg-muted"
                aria-label="Terminer et relire avant d'envoyer"
                title="Terminer et relire"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleStopAndSend}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-golf text-golf-foreground transition-opacity hover:opacity-90"
                aria-label="Terminer et envoyer"
                title="Terminer et envoyer"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isTranscribing
                    ? isAutoSending
                      ? "Transcription et envoi…"
                      : "Transcription en cours…"
                    : "Posez votre question..."
                }
                // 16 px minimum sur mobile : en dessous, Safari iOS zoome
                // la page au focus du champ (et elle ne se dézoome pas).
                className="block w-full resize-none bg-transparent px-2.5 py-1.5 text-base leading-6 focus:outline-none min-h-[36px] max-h-[min(200px,30dvh)] placeholder:text-muted-foreground md:px-1.5 md:text-sm"
                rows={1}
                disabled={isTranscribing}
              />
              <div className="flex items-center gap-1 md:mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  multiple
                  className="hidden"
                  onChange={handleFilesSelected}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  aria-label="Joindre une photo ou un document"
                  className={ICON_BUTTON}
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1 px-1 text-xs">
                  {isTooLong ? (
                    <span className="text-destructive">
                      Trop long : {message.length.toLocaleString("fr-FR")} /{" "}
                      {MAX_MESSAGE_LENGTH.toLocaleString("fr-FR")}
                    </span>
                  ) : message.length >= COUNTER_THRESHOLD ? (
                    <span className="text-muted-foreground tabular-nums">
                      {message.length.toLocaleString("fr-FR")} /{" "}
                      {MAX_MESSAGE_LENGTH.toLocaleString("fr-FR")}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isBusy}
                  aria-label="Dictée vocale"
                  className={ICON_BUTTON}
                >
                  {isTranscribing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </button>
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={onStop}
                    aria-label="Arrêter la génération"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label="Envoyer"
                    disabled={
                      (!message.trim() && attachments.length === 0) ||
                      isTranscribing ||
                      isTooLong ||
                      isUploading
                    }
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80",
                      "disabled:bg-muted-foreground/20 disabled:text-muted-foreground disabled:hover:opacity-100"
                    )}
                  >
                    <ArrowUp className="h-5 w-5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
