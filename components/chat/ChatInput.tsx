"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isBusy = isStreaming || isTranscribing;

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {voiceError && (
          <p className="text-sm text-destructive px-1">{voiceError}</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isTranscribing
                ? "Transcription en cours..."
                : "Posez votre question..."
            }
            className="flex-1 resize-none rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px] max-h-[200px]"
            rows={1}
            disabled={isBusy}
          />
          <Button
            type="button"
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            onClick={handleMicClick}
            disabled={isTranscribing || isStreaming}
            aria-label={isRecording ? "Arreter l'enregistrement" : "Dictee vocale"}
            className={isRecording ? "animate-pulse" : ""}
          >
            {isTranscribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isBusy}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
