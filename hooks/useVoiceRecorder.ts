"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import fixWebmDuration from "fix-webm-duration";

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  recordingSeconds: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  audioBlob: Blob | null;
}

// Un chunk par seconde plutôt qu'un unique buffer accumulé par le navigateur :
// le blob final est identique, mais les prises longues ne dépendent plus d'un
// seul gros segment.
const TIMESLICE_MS = 1000;

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const startRecording = useCallback(async () => {
    try {
      setAudioBlob(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer webm/opus, fall back to mp4 (Safari/iOS), else browser default
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : undefined;

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const type = mediaRecorder.mimeType || "audio/webm";
        const rawBlob = new Blob(chunksRef.current, { type });
        const durationMs = Date.now() - startTimeRef.current;

        // Le WebM produit par MediaRecorder n'inscrit pas la durée dans son
        // en-tête, ce qui fait tronquer les transcriptions Whisper sur les
        // dictées longues — on réécrit la durée avant l'envoi.
        let blob = rawBlob;
        if (type.includes("webm")) {
          try {
            blob = await fixWebmDuration(rawBlob, durationMs, { logger: false });
          } catch {
            blob = rawBlob; // mieux vaut un blob imparfait que pas d'audio
          }
        }
        setAudioBlob(blob);

        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(TIMESLICE_MS);
      startTimeRef.current = Date.now();
      setRecordingSeconds(0);
      clearTimer();
      timerRef.current = setInterval(() => {
        setRecordingSeconds(
          Math.floor((Date.now() - startTimeRef.current) / 1000)
        );
      }, 1000);
      setIsRecording(true);
    } catch (error) {
      // Handle permission denied or no microphone available
      const err = error as DOMException;
      if (err.name === "NotAllowedError") {
        throw new Error(
          "L'acces au microphone a ete refuse. Veuillez autoriser l'acces dans les parametres de votre navigateur."
        );
      } else if (err.name === "NotFoundError") {
        throw new Error(
          "Aucun microphone detecte. Veuillez connecter un microphone et reessayer."
        );
      } else {
        throw new Error(
          "Erreur lors de l'acces au microphone. Veuillez reessayer."
        );
      }
    }
  }, [clearTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    clearTimer();
  }, [clearTimer]);

  return {
    isRecording,
    recordingSeconds,
    startRecording,
    stopRecording,
    audioBlob,
  };
}
