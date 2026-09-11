"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  countSegments,
  deleteMeeting,
  isInterrupted,
  isOfflineStoreAvailable,
  listMeetings,
  type OfflineMeeting,
} from "@/lib/meetings/offline-store";
import {
  AuthError,
  isMeetingBusy,
  NetworkError,
  ProcessingError,
  syncOfflineMeeting,
  type SyncProgress,
} from "@/lib/meetings/offline-sync";
import { PROCESS_STAGES } from "@/lib/meetings/process-stages";
import { formatDuration } from "@/lib/meetings/transcript";
import { useConnectivity } from "./use-connectivity";

interface PendingRow {
  meeting: OfflineMeeting;
  segments: number;
  /** Otra pestaña la está grabando o subiendo */
  busyElsewhere: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Las reuniones grabadas en este equipo que todavía no llegaron al servidor.
 *
 * Con conexión se suben y se analizan solas, una detrás de otra; sin conexión se
 * listan para que se sepa que el audio está a salvo. Si no hay ninguna, no se
 * pinta nada: es un aviso, no una sección fija.
 */
export function PendingOfflineMeetings() {
  const router = useRouter();
  const [online, setOnline] = useConnectivity();
  // null mientras se lee el almacén: no se pinta nada hasta saber si hay algo.
  const [rows, setRows] = useState<PendingRow[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [analysisFailed, setAnalysisFailed] = useState<{ serverId: string; message: string } | null>(null);
  const runningRef = useRef(false);
  // Cada reunión se intenta subir sola una vez por cada vuelta de la conexión.
  // Sin esto, una que falla por la sesión se reintentaría en bucle.
  const autoTriedRef = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!isOfflineStoreAvailable()) {
      setRows([]);
      return;
    }
    try {
      const all = await listMeetings();
      const now = Date.now();
      const next = await Promise.all(
        all.map(async (meeting) => ({
          meeting,
          segments: await countSegments(meeting.localId),
          busyElsewhere: await isMeetingBusy(meeting.localId),
        }))
      );
      // Una grabación en curso en esta sesión no es "pendiente" todavía; sí lo es
      // una que se cortó sin detenerse, y se muestra la que otra pestaña está usando.
      setRows(
        next.filter(
          (r) => r.meeting.state !== "recording" || isInterrupted(r.meeting, now) || r.busyElsewhere
        )
      );
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!online) autoTriedRef.current.clear();
  }, [online]);

  const sync = useCallback(
    async (list: PendingRow[]) => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        for (const row of list) {
          if (row.busyElsewhere) continue;
          setActive(row.meeting.localId);
          setProgress(null);
          try {
            const result = await syncOfflineMeeting(row.meeting.localId, { onProgress: setProgress });
            if (result) router.refresh();
          } catch (err) {
            if (err instanceof ProcessingError) {
              setAnalysisFailed({ serverId: err.serverId, message: err.message });
              router.refresh();
            } else if (err instanceof NetworkError) {
              setOnline(false);
              break;
            } else if (err instanceof AuthError) {
              setAuthBlocked(true);
              break;
            }
            // Los demás errores quedan guardados en la reunión y se ven en su fila.
          }
        }
      } finally {
        runningRef.current = false;
        setActive(null);
        setProgress(null);
        await load();
      }
    },
    [load, router, setOnline]
  );

  useEffect(() => {
    if (!online || !rows || authBlocked) return;
    const auto = rows.filter(
      (r) =>
        !r.busyElsewhere &&
        r.meeting.state !== "error" &&
        !autoTriedRef.current.has(r.meeting.localId)
    );
    if (auto.length === 0) return;
    auto.forEach((r) => autoTriedRef.current.add(r.meeting.localId));
    void sync(auto);
  }, [online, rows, authBlocked, sync]);

  async function discard(row: PendingRow) {
    const ok = window.confirm(
      `¿Descartar «${row.meeting.draft.title}»? El audio guardado en este equipo se borra y no se puede recuperar.`
    );
    if (!ok) return;
    await deleteMeeting(row.meeting.localId);
    await load();
  }

  if (!rows || (rows.length === 0 && !analysisFailed)) return null;

  const running = active !== null;

  return (
    <section
      aria-label="Reuniones guardadas en este equipo"
      className="bg-panel border border-warn/25 rounded-2xl p-4 sm:p-6 mb-6"
    >
      {rows.length > 0 && (
        <>
          <h2 className="text-fg text-sm font-semibold">
            {rows.length === 1
              ? "1 reunión grabada en este equipo sin subir"
              : `${rows.length} reuniones grabadas en este equipo sin subir`}
          </h2>
          <p className="text-fg-dim text-xs mt-1 leading-relaxed" role="status">
            {authBlocked
              ? "Tu sesión se cerró. Vuelve a iniciar sesión y se suben solas; el audio sigue a salvo aquí."
              : online
                ? running
                  ? "Se están subiendo y analizando. No cierres esta pestaña hasta que terminen."
                  : "El audio está a salvo en este equipo."
                : "Sin conexión. El audio está a salvo en este equipo y se sube solo cuando vuelva la red."}
          </p>

          <ul className="divide-y divide-line mt-3">
            {rows.map((row) => {
              const { meeting } = row;
              const isActive = active === meeting.localId;
              const interrupted = isInterrupted(meeting);
              const meta = [
                new Date(meeting.createdAt).toLocaleString("es-PA", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                meeting.durationMs > 0 ? formatDuration(meeting.durationMs) : null,
                plural(row.segments, "tramo guardado", "tramos guardados"),
                interrupted ? "la grabación se cortó sin detenerse" : null,
              ].filter(Boolean);

              let status: React.ReactNode = null;
              if (isActive && progress) {
                status =
                  progress.step === "upload" ? (
                    <span className="text-fg-dim">
                      Subiendo {progress.uploaded} de {progress.total}
                    </span>
                  ) : (
                    <span className="text-fg-dim">
                      {PROCESS_STAGES[progress.stageIndex]?.label ?? "Analizando"}…
                    </span>
                  );
              } else if (isActive) {
                status = <span className="text-fg-dim">Preparando…</span>;
              } else if (row.busyElsewhere) {
                status = <span className="text-fg-faint">Abierta en otra pestaña</span>;
              } else if (!online) {
                status = <span className="text-fg-faint">Esperando conexión</span>;
              }

              return (
                <li key={meeting.localId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-fg-soft text-sm font-medium break-words">{meeting.draft.title}</p>
                      <p className="text-fg-faint text-xs mt-1">{meta.join(" · ")}</p>
                      {meeting.state === "error" && meeting.lastError && (
                        <p className="text-danger text-xs mt-1">{meeting.lastError}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      {status}
                      {!isActive && !row.busyElsewhere && online && !authBlocked && (
                        <button
                          onClick={() => void sync([row])}
                          disabled={running}
                          className="px-4 min-h-[44px] bg-brand hover:bg-brand-hi disabled:opacity-50 text-on-brand text-sm font-semibold rounded-lg transition-all"
                        >
                          {meeting.state === "error" ? "Reintentar la subida" : "Subir y analizar"}
                        </button>
                      )}
                      {!isActive && !row.busyElsewhere && (
                        <button
                          onClick={() => void discard(row)}
                          disabled={running}
                          className="px-2 min-h-[44px] text-fg-faint hover:text-danger disabled:opacity-50 transition-colors"
                        >
                          Descartar
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {analysisFailed && (
        <p className={`text-sm leading-relaxed ${rows.length > 0 ? "mt-4 pt-4 border-t border-line" : ""}`}>
          <span className="text-fg-soft">
            El audio ya está en el servidor, pero el análisis falló: {analysisFailed.message}.{" "}
          </span>
          <Link
            href={`/empresa/reuniones/${analysisFailed.serverId}`}
            className="text-brand-fg underline underline-offset-2"
          >
            Abrir la reunión para reintentarlo
          </Link>
        </p>
      )}
    </section>
  );
}
