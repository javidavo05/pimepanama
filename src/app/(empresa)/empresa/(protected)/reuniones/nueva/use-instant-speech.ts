"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vista previa instantánea de lo que se está diciendo, usando el reconocimiento
 * de voz del navegador (Chrome). Aparece palabra por palabra, sin esperar a que
 * se cierre un tramo de audio.
 *
 * NO es la transcripción: la buena es la de Whisper, que llega unos segundos
 * después y es la que se guarda. Esto existe solo para que la pantalla responda
 * mientras se habla — sin esto, la conversación se ve siempre con retraso.
 *
 * Escucha el micrófono por defecto del sistema, no la mezcla de canales, así que
 * en una llamada con audífonos solo capta tu voz. Si el navegador no lo soporta
 * devuelve cadena vacía y no molesta.
 */

interface SpeechAlternative {
  transcript: string;
}

interface SpeechResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechAlternative;
}

interface SpeechResultList {
  readonly length: number;
  [index: number]: SpeechResult;
}

interface SpeechResultEvent {
  resultIndex: number;
  results: SpeechResultList;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isInstantSpeechSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/** Cuánto se deja en pantalla la última frase confirmada antes de limpiarla. */
const LINGER_MS = 2500;
/** Recorte de la vista previa: es un vistazo, no un historial. */
const MAX_CHARS = 240;

export function useInstantSpeech(active: boolean, language: "es" | "en"): string {
  const [text, setText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      setText("");
      return;
    }

    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    let cancelled = false;
    const recognition = new Ctor();
    recognition.lang = language === "en" ? "en-US" : "es-PA";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let phrase = "";
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        phrase += result[0]?.transcript ?? "";
        if (result.isFinal) isFinal = true;
      }
      phrase = phrase.trim();
      if (!phrase) return;

      setText(phrase.length > MAX_CHARS ? `…${phrase.slice(-MAX_CHARS)}` : phrase);

      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (isFinal) {
        // La frase confirmada se queda un momento y se va: la versión definitiva
        // la pinta Whisper unos segundos después y no queremos verla dos veces.
        clearTimerRef.current = setTimeout(() => setText(""), LINGER_MS);
      }
    };

    // Chrome corta el reconocimiento solo tras un silencio largo; se relanza
    // mientras la reunión siga viva.
    recognition.onend = () => {
      if (cancelled) return;
      try {
        recognition.start();
      } catch {
        // Ya arrancado o el navegador lo bloqueó: no es fatal, seguimos sin vista previa.
      }
    };

    recognition.onerror = (event) => {
      // "no-speech" y "aborted" son ruido normal; el resto apaga la vista previa
      // sin tocar la grabación, que es lo que de verdad importa.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        cancelled = true;
        setText("");
      }
    };

    try {
      recognition.start();
    } catch {
      // Algunos navegadores lanzan si ya hay un reconocimiento vivo.
    }

    return () => {
      cancelled = true;
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        // Nada que hacer si ya estaba muerto.
      }
      recognitionRef.current = null;
      setText("");
    };
  }, [active, language]);

  return text;
}
