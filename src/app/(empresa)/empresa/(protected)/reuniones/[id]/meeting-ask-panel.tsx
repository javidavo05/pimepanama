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
      <p className="text-white/40 text-sm">
        Esta reunión no tiene transcripción todavía, así que no hay nada que preguntarle.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-white/50 text-xs leading-relaxed">
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
              className="px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.07] disabled:opacity-40 border border-white/[0.06] text-white/60 text-xs rounded-lg transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {history.map((ex, i) => (
          <div key={i} className="space-y-2">
            <p className="text-white text-sm font-medium">{ex.question}</p>
            <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{ex.answer}</p>
            {ex.citations.length > 0 && (
              <div className="space-y-1.5 pl-3 border-l border-[#1AA7F0]/25">
                {ex.citations.map((c, j) => (
                  <div key={j} className="text-xs">
                    <button
                      onClick={() => onSeek(c.startMs)}
                      className="text-[#1AA7F0]/80 hover:text-[#1AA7F0] font-mono transition-colors"
                      title="Escuchar este momento"
                    >
                      ▸ {formatTimestamp(c.startMs)}
                    </button>
                    <span className="text-white/40"> · {c.speaker}</span>
                    <p className="text-white/60 italic leading-relaxed mt-0.5">«{c.quote}»</p>
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
          className="flex-1 bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none"
        />
        <button
          onClick={() => void ask(question)}
          disabled={busy || !question.trim()}
          className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all shrink-0"
        >
          {busy ? "Buscando…" : "Preguntar"}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
