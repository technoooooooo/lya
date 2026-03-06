"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
}

export function ChatInput({ onSend, isStreaming }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const { isRecording, startRecording, stopRecording, audioBlob } =
    useVoiceRecorder();

  const transcribeAudio = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);
      setVoiceError(null);

      try {
        const formData = new FormData();
        formData.append("audio", blob, "audio.webm");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isStreaming) return;
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            <div />
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
                disabled={!message.trim() || isBusy}
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
