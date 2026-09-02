"use client";

import { useMemo, useState } from "react";
import { findEchoes } from "@/lib/meetings/echo";
import { formatTimestamp, groupTurns } from "@/lib/meetings/transcript";
import type { MeetingSegment } from "@/lib/meetings/types";

interface MeetingTranscriptViewProps {
  segments: MeetingSegment[];
  /** Transcripción plana, para reuniones a las que aún no se les separó la voz */
  fallback: string | null;
  onSeek: (ms: number) => void;
}

/**
 * La transcripción como conversación, con el minuto de cada turno.
 *
 * Se arma desde los segmentos y no desde el markdown que guarda la reunión: así
 * el timestamp es un número real con el que saltar al audio, en vez de un texto
 * que había que volver a parsear con una expresión regular.
 */
export function MeetingTranscriptView({ segments, fallback, onSeek }: MeetingTranscriptViewProps) {
  const [query, setQuery] = useState("");
  // Lo que el altavoz devolvió al micrófono se aparta de la conversación: es la
  // misma frase del cliente, transcrita peor y atribuida a quien no la dijo.
  const { turns, echoCount } = useMemo(() => {
    const echoes = findEchoes(segments);
    return {
      turns: groupTurns(segments.filter((_, i) => !echoes[i])),
      echoCount: echoes.filter(Boolean).length,
    };
  }, [segments]);

  const term = query.trim().toLowerCase();
  const visible = term
    ? turns.filter((t) => t.text.toLowerCase().includes(term) || t.speaker.toLowerCase().includes(term))
    : turns;

  if (turns.length === 0) {
    if (!fallback) return <p className="text-white/40 text-sm">Esta reunión no tiene audio transcrito.</p>;
    return (
      <>
        <p className="text-white/40 text-xs">
          Sin atribuir todavía — corre la etapa «Hablantes» para separar quién dijo qué.
        </p>
        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap max-h-[70vh] overflow-y-auto">
          {fallback}
        </p>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en la transcripción…"
          className="flex-1 min-w-[200px] bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none"
        />
        <span className="text-white/35 text-xs shrink-0">
          {term
            ? `${visible.length} de ${turns.length} intervenciones`
            : `${turns.length} intervenciones · pulsa el minuto para escucharlo`}
        </span>
      </div>

      {echoCount > 0 && (
        <p className="text-white/35 text-[11px]">
          Se apartaron {echoCount} fragmento{echoCount !== 1 ? "s" : ""} que tu micrófono captó del
          altavoz: eran la voz del cliente repetida. Con audífonos no ocurre.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="text-white/40 text-sm">Nadie dijo eso en esta reunión.</p>
      ) : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {visible.map((turn, i) => (
            <div key={`${turn.start}-${i}`} className="flex gap-3">
              <div className="w-32 shrink-0 text-right">
                <p className="text-[#1AA7F0] text-xs font-medium truncate">{turn.speaker}</p>
                <button
                  onClick={() => onSeek(turn.start)}
                  className="text-white/30 hover:text-[#1AA7F0] text-[10px] font-mono transition-colors"
                  title="Escuchar desde aquí"
                >
                  ▸ {formatTimestamp(turn.start)}
                </button>
              </div>
              <p className="text-white/75 text-sm leading-relaxed flex-1">{turn.text}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
