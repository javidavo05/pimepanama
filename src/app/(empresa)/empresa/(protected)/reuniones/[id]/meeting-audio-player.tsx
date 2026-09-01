"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTimestamp } from "@/lib/meetings/transcript";
import type { MeetingAudioChunk, MeetingChannel } from "@/lib/meetings/types";

interface SignedChunk extends MeetingAudioChunk {
  url: string;
}

export interface SeekRequest {
  ms: number;
  /** Cambia en cada petición para que dos saltos al mismo minuto se noten */
  nonce: number;
}

interface MeetingAudioPlayerProps {
  meetingId: string;
  durationMs: number;
  /** Salto pedido desde la transcripción, un capítulo o una cita */
  seek: SeekRequest | null;
}

const CHANNEL_LABEL: Record<MeetingChannel, string> = {
  LOCAL: "Tu micrófono",
  REMOTE: "Audio de la llamada",
};

/**
 * Reproductor de la reunión.
 *
 * La grabación no es un archivo: son decenas de tramos cortos, uno por cada
 * trozo que se subió a transcribir. El reproductor los encadena usando el
 * `offsetMs` de cada uno, así que la reunión se escucha seguida y se puede
 * saltar a un minuto concreto — que es lo que convierte la transcripción en algo
 * verificable: se lee un turno, se pulsa, y se oye si de verdad se dijo eso.
 *
 * Cuando se grabó con dos fuentes separadas hay dos pistas paralelas y se elige
 * cuál escuchar; no se mezclan, porque cada una cubre toda la reunión.
 */
export function MeetingAudioPlayer({ meetingId, durationMs, seek }: MeetingAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [chunks, setChunks] = useState<SignedChunk[]>([]);
  const [channel, setChannel] = useState<MeetingChannel | "ALL">("ALL");
  const [current, setCurrent] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // El salto queda pendiente hasta que el tramo destino termine de cargar.
  const pendingOffsetRef = useRef<number | null>(null);

  const channels = useMemo(() => {
    const found = new Set<MeetingChannel>();
    for (const c of chunks) if (c.channel) found.add(c.channel);
    return [...found];
  }, [chunks]);

  const track = useMemo(() => {
    const list = channel === "ALL" ? chunks : chunks.filter((c) => c.channel === channel);
    return list.length > 0 ? list : chunks;
  }, [chunks, channel]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}/audio`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar el audio");
      const list: SignedChunk[] = data.chunks ?? [];
      if (list.length === 0) throw new Error("Esta reunión no tiene audio archivado.");
      setChunks(list);
      setLoaded(true);
      // Con dos fuentes se arranca por el micrófono propio, que es el que
      // siempre existe; la otra pista se elige a mano.
      const withChannel = new Set(list.flatMap((c) => (c.channel ? [c.channel] : [])));
      if (withChannel.size > 1) setChannel("LOCAL");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el audio");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  /** Salta al momento pedido: elige el tramo que lo contiene y se posiciona dentro. */
  const seekTo = useCallback(
    (ms: number) => {
      if (track.length === 0) return;
      let index = 0;
      for (let i = 0; i < track.length; i++) {
        if (track[i].offsetMs <= ms) index = i;
        else break;
      }
      pendingOffsetRef.current = Math.max(0, ms - track[index].offsetMs);
      if (index === current) {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = pendingOffsetRef.current / 1000;
          pendingOffsetRef.current = null;
          void audio.play().catch(() => undefined);
        }
      } else {
        setCurrent(index);
      }
    },
    [track, current]
  );

  // Un salto pedido desde fuera carga el audio si todavía no se había abierto;
  // al quedar cargado, este mismo efecto vuelve a correr y atiende el salto.
  useEffect(() => {
    if (!seek) return;
    if (!loaded) {
      void load();
      return;
    }
    seekTo(seek.ms);
  }, [seek, loaded, load, seekTo]);

  function onLoadedMetadata() {
    const audio = audioRef.current;
    if (!audio) return;
    if (pendingOffsetRef.current !== null) {
      audio.currentTime = pendingOffsetRef.current / 1000;
      pendingOffsetRef.current = null;
    }
    if (playing) void audio.play().catch(() => undefined);
  }

  function onTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !track[current]) return;
    setPositionMs(track[current].offsetMs + audio.currentTime * 1000);
  }

  function onEnded() {
    if (current < track.length - 1) {
      setCurrent((i) => i + 1);
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setPlaying(true);
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function scrub(value: number) {
    seekTo(value);
    setPositionMs(value);
  }

  if (!loaded) {
    return (
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-white/70 text-xs uppercase tracking-wider">Audio de la reunión</p>
          <p className="text-white/40 text-xs mt-0.5">
            {error ?? "Escucha la grabación y salta al minuto de cualquier turno."}
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 border border-white/[0.08] text-white/70 text-xs rounded-lg transition-all shrink-0"
        >
          {loading ? "Cargando…" : "▶ Cargar audio"}
        </button>
      </div>
    );
  }

  const total = Math.max(durationMs, track[track.length - 1]?.offsetMs ?? 0);

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl px-6 py-4 space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full bg-[#1AA7F0] hover:bg-[#0E87C8] text-white flex items-center justify-center transition-all shrink-0"
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? "❚❚" : "▶"}
        </button>

        <div className="flex-1 min-w-[200px]">
          <input
            type="range"
            min={0}
            max={Math.max(total, 1)}
            value={Math.min(positionMs, total)}
            onChange={(e) => scrub(Number(e.target.value))}
            className="w-full accent-[#1AA7F0]"
            aria-label="Posición en la reunión"
          />
          <div className="flex justify-between text-white/40 text-[10px] font-mono mt-0.5">
            <span>{formatTimestamp(positionMs)}</span>
            <span>{formatTimestamp(total)}</span>
          </div>
        </div>

        {channels.length > 1 && (
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value as MeetingChannel);
              setCurrent(0);
              setPositionMs(0);
            }}
            className="bg-[#050508] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-[#1AA7F0]/50 focus:outline-none shrink-0"
          >
            {channels.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-white/30 text-[11px]">
        Tramo {current + 1} de {track.length}. La grabación se guardó por tramos, así que al pasar
        de uno a otro puede haber un salto de una fracción de segundo.
      </p>

      <audio
        ref={audioRef}
        src={track[current]?.url}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="auto"
        className="hidden"
      />
      {/* Precarga del siguiente tramo, para acortar el corte al encadenar. */}
      {track[current + 1] && <audio src={track[current + 1].url} preload="auto" className="hidden" />}
    </div>
  );
}
