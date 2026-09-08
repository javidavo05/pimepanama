"use client";

import { useEffect, useRef } from "react";
import { formatTimestamp, groupTurns } from "@/lib/meetings/transcript";
import type { MeetingChannel, MeetingSegment } from "@/lib/meetings/types";

export const CHANNEL_ACCENT: Record<MeetingChannel | "NONE", { dot: string; name: string; bubble: string }> = {
  LOCAL: {
    dot: "bg-brand",
    name: "text-brand-fg",
    bubble: "bg-brand/[0.07] border-brand/20",
  },
  REMOTE: {
    dot: "bg-sand",
    name: "text-sand-fg",
    bubble: "bg-sand/[0.07] border-sand/20",
  },
  NONE: {
    dot: "bg-fg-trace",
    name: "text-fg-faint",
    bubble: "bg-fill border-line",
  },
};

interface LiveTranscriptProps {
  segments: MeetingSegment[];
  /** Nombre a mostrar para un segmento que todavía no tiene hablante asignado */
  labelFor: (seg: MeetingSegment) => string;
  /** Texto provisional del reconocimiento instantáneo, aún sin confirmar por Whisper */
  interim: string;
  interimSpeaker: string;
  emptyHint: string;
}

/**
 * La conversación tal como se va armando: un turno por persona, con el canal
 * marcado por color. Debajo, en gris, lo que el navegador está oyendo ahora
 * mismo y todavía no ha confirmado la transcripción real.
 */
export function LiveTranscript({
  segments,
  labelFor,
  interim,
  interimSpeaker,
  emptyHint,
}: LiveTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  const turns = groupTurns(segments, labelFor);

  // Se auto-scrollea solo si el usuario está mirando el final. Si subió a releer
  // algo, no se le arrastra la vista cada vez que entra un tramo.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [turns.length, interim]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1"
    >
      {turns.length === 0 && !interim && <p className="text-fg-ghost text-sm">{emptyHint}</p>}

      {turns.map((turn, i) => {
        const accent = CHANNEL_ACCENT[turn.channel ?? "NONE"];
        return (
          <div key={`${turn.start}-${i}`} className={`border rounded-xl px-3.5 py-2.5 ${accent.bubble}`}>
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
              <span className={`text-xs font-medium ${accent.name}`}>{turn.speaker}</span>
              <span className="text-fg-ghost text-[10px] font-mono">{formatTimestamp(turn.start)}</span>
            </div>
            <p className="text-fg-soft text-sm leading-relaxed">{turn.text}</p>
          </div>
        );
      })}

      {interim && (
        <div className="border border-dashed border-line-mid rounded-xl px-3.5 py-2.5">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-fg-ghost animate-pulse" />
            <span className="text-fg-faint text-xs font-medium">{interimSpeaker}</span>
            <span className="text-fg-ghost text-[10px]">escuchando…</span>
          </div>
          <p className="text-fg-faint text-sm leading-relaxed italic">{interim}</p>
        </div>
      )}
    </div>
  );
}
