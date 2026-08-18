"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Mic, MicOff, Loader2, Paperclip, Square, FileText, X } from "lucide-react";
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

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isRecording,
    recordingSeconds,
    startRecording,
    stopRecording,
    audioBlob,
  } = useVoiceRecorder();

  const transcribeAudio = useCallback(
    async (blob: Blob) => {
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
          return;
        }

        const transcribedText = result.data.text;
        if (transcribedText) {
          setMessage((prev) =>
            prev ? `${prev} ${transcribedText}` : transcribedText
          );
        }
      } catch {
        setError("Erreur de connexion au serveur");
      } finally {
        setIsTranscribing(false);
      }
    },
    []
  );

  // When audioBlob changes (recording stopped), send it for transcription
  useEffect(() => {
    if (audioBlob) {
      transcribeAudio(audioBlob);
    }
  }, [audioBlob, transcribeAudio]);

  const handleMicClick = async () => {
    setError(null);

    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de l'acces au microphone"
        );
      }
    }
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

  const isTooLong = message.length > MAX_MESSAGE_LENGTH;
  const isUploading = uploadingCount > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if ((!text && attachments.length === 0) || isStreaming || isTooLong || isUploading)
      return;

    // Les pièces jointes sont référencées en markdown à la fin du message —
    // c'est la convention lue par le serveur et par l'affichage des bulles.
    const attachmentLines = attachments
      .map((a) =>
        a.kind === "image"
          ? imageAttachmentMarkdown(a.name, a.url)
          : docAttachmentMarkdown(a.name, a.url)
      )
      .join("\n");
    const content = [text, attachmentLines].filter(Boolean).join("\n\n");

    onSend(content);
    setMessage("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isBusy = isStreaming || isTranscribing;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isBusy) {
      textareaRef.current?.focus();
    }
  }, [isBusy]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {error && <p className="text-sm text-destructive px-1">{error}</p>}
        <div className="rounded-2xl border bg-muted/40 p-3">
          {isRecording && (
            <div className="flex items-center gap-2 px-1 pb-2 text-sm">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>
              <span className="font-medium text-destructive">
                Enregistrement en cours
              </span>
              <span className="tabular-nums text-destructive">
                {formatDuration(recordingSeconds)}
              </span>
              <span className="text-muted-foreground hidden sm:inline">
                — cliquez sur le micro pour terminer
              </span>
            </div>
          )}
          {(attachments.length > 0 || isUploading) && (
            <div className="flex flex-wrap items-center gap-2 px-1 pb-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.url}
                  className="group relative flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5 text-xs"
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
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isTranscribing
                ? "Transcription en cours..."
                : "Posez votre question..."
            }
            className="w-full resize-none bg-transparent px-1 py-1 text-sm focus:outline-none min-h-[24px] max-h-[200px] placeholder:text-muted-foreground"
            rows={1}
            disabled={isTranscribing}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="px-1 text-xs">
              {isTooLong ? (
                <span className="text-destructive">
                  Message trop long : {message.length.toLocaleString("fr-FR")} /{" "}
                  {MAX_MESSAGE_LENGTH.toLocaleString("fr-FR")} caractères
                </span>
              ) : message.length >= COUNTER_THRESHOLD ? (
                <span className="text-muted-foreground tabular-nums">
                  {message.length.toLocaleString("fr-FR")} /{" "}
                  {MAX_MESSAGE_LENGTH.toLocaleString("fr-FR")}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
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
                disabled={isTranscribing || isStreaming}
                aria-label="Joindre une photo ou un document"
                className="p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleMicClick}
                disabled={isTranscribing || isStreaming}
                aria-label={isRecording ? "Arreter l'enregistrement" : "Dictee vocale"}
                className={`p-2 rounded-lg transition-colors hover:bg-muted disabled:opacity-50 ${
                  isRecording ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isTranscribing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Arrêter la génération"
                  className="p-2 rounded-lg transition-colors bg-foreground text-background hover:opacity-80"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    (!message.trim() && attachments.length === 0) ||
                    isTranscribing ||
                    isTooLong ||
                    isUploading
                  }
                  className="p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <Send className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
