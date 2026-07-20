"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { MAX_MESSAGE_LENGTH } from "@/lib/validations/chat";

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
}

// Seuil d'affichage du compteur : inutile de l'afficher sur un message
// ordinaire, il n'apparaît qu'à l'approche de la limite (long texte collé).
const COUNTER_THRESHOLD = Math.floor(MAX_MESSAGE_LENGTH * 0.8);

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ChatInput({ onSend, isStreaming }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

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
      setVoiceError(null);

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
          setVoiceError(result.error?.message || "Erreur de transcription");
          return;
        }

        const transcribedText = result.data.text;
        if (transcribedText) {
          setMessage((prev) =>
            prev ? `${prev} ${transcribedText}` : transcribedText
          );
        }
      } catch {
        setVoiceError("Erreur de connexion au serveur");
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
    setVoiceError(null);

    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error) {
        setVoiceError(
          error instanceof Error
            ? error.message
            : "Erreur lors de l'acces au microphone"
        );
      }
    }
  };

  const isTooLong = message.length > MAX_MESSAGE_LENGTH;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isStreaming || isTooLong) return;
    onSend(message.trim());
    setMessage("");
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
        {voiceError && (
          <p className="text-sm text-destructive px-1">{voiceError}</p>
        )}
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
            disabled={isBusy}
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
              <button
                type="submit"
                disabled={!message.trim() || isBusy || isTooLong}
                className="p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
