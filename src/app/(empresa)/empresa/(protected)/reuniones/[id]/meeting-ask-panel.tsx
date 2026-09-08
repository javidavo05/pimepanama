"use client";

import { useState } from "react";
import { formatTimestamp } from "@/lib/meetings/transcript";

interface Citation {
  startMs: number;
  speaker: string;
  quote: string;
}

interface Exchange {
  question: string;
  answer: string;
  citations: Citation[];
}

interface MeetingAskPanelProps {
  meetingId: string;
  hasTranscript: boolean;
  onSeek: (ms: number) => void;
}

const SUGGESTIONS = [
  "¿Qué se acordó sobre el precio?",
  "¿Quedó alguna fecha comprometida?",
  "¿Qué objeciones puso el cliente?",
  "¿Qué quedó sin definir?",
];

/**
 * Preguntas sobre lo que se dijo, respondidas con la cita textual y su minuto.
 *
 * La minuta resume, y a veces lo que hace falta es el detalle exacto: qué dijo
 * el cliente sobre el precio, si se llegó a mencionar un plazo. La cita con
 * timestamp hace la respuesta comprobable — se pulsa y se escucha el momento en
 * el que se dijo, en vez de tener que confiar en el modelo.
 */
export function MeetingAskPanel({ meetingId, hasTranscript, onSeek }: MeetingAskPanelProps) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo responder");
      setHistory((prev) => [
        ...prev,
        { question: q, answer: data.answer ?? "", citations: data.citations ?? [] },
      ]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo responder");
    } finally {
      setBusy(false);
    }
  }

  if (!hasTranscript) {
    return (
      <p className="text-fg-ghost text-sm">
        Esta reunión no tiene transcripción todavía, así que no hay nada que preguntarle.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-fg-faint text-xs leading-relaxed">
        Responde solo con lo que se dijo en esta reunión, citando el minuto. Si algo no se habló, lo
        dice en vez de completarlo.
      </p>

      {history.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void ask(s)}
              disabled={busy}
              className="px-3 py-1.5 bg-fill hover:bg-fill-2 disabled:opacity-40 border border-line text-fg-dim text-xs rounded-lg transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {history.map((ex, i) => (
          <div key={i} className="space-y-2">
            <p className="text-fg text-sm font-medium">{ex.question}</p>
            <p className="text-fg-soft text-sm leading-relaxed whitespace-pre-wrap">{ex.answer}</p>
            {ex.citations.length > 0 && (
              <div className="space-y-1.5 pl-3 border-l border-brand/25">
                {ex.citations.map((c, j) => (
                  <div key={j} className="text-xs">
                    <button
                      onClick={() => onSeek(c.startMs)}
                      className="text-brand-fg hover:text-brand-fg font-mono transition-colors"
                      title="Escuchar este momento"
                    >
                      ▸ {formatTimestamp(c.startMs)}
                    </button>
                    <span className="text-fg-ghost"> · {c.speaker}</span>
                    <p className="text-fg-dim italic leading-relaxed mt-0.5">«{c.quote}»</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void ask(question);
          }}
          placeholder="¿Qué quieres saber de esta reunión?"
          className="flex-1 bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
        />
        <button
          onClick={() => void ask(question)}
          disabled={busy || !question.trim()}
          className="px-4 py-2 bg-brand hover:bg-brand-hi disabled:opacity-40 text-on-brand text-xs font-semibold rounded-lg transition-all shrink-0"
        >
          {busy ? "Buscando…" : "Preguntar"}
        </button>
      </div>

      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
