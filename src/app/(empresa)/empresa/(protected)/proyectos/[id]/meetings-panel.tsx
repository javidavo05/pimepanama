"use client";

import Link from "next/link";
import { formatDuration } from "@/lib/meetings/transcript";
import {
  MEETING_STATUS_COLOR,
  MEETING_STATUS_LABEL,
} from "@/app/(empresa)/empresa/(protected)/reuniones/status";
import type { ProjectMeeting } from "./types";

/**
 * Reuniones del proyecto: es el hilo de contexto que la IA lee en cada reunión
 * nueva, así que el panel muestra el resumen que se guardó y lo que quedó abierto.
 */
export function MeetingsPanel({
  projectId,
  meetings,
}: {
  projectId: string;
  meetings: ProjectMeeting[];
}) {
  const openItems = meetings.reduce((sum, m) => sum + m.openItemCount, 0);

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-white font-medium">Reuniones</h2>
          <p className="text-white/50 text-xs mt-0.5">
            {meetings.length === 0
              ? "El contexto que la IA usa para entender de qué se habla"
              : `${meetings.length} grabada${meetings.length !== 1 ? "s" : ""}${
                  openItems > 0 ? ` · ${openItems} pendiente${openItems !== 1 ? "s" : ""} sin pasar a tareas` : ""
                }`}
          </p>
        </div>
        <Link
          href={`/empresa/reuniones/nueva?projectId=${projectId}`}
          className="px-3 py-1.5 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-xs font-semibold rounded-lg transition-all shrink-0"
        >
          🎙️ Grabar
        </Link>
      </div>

      {meetings.length === 0 ? (
        <p className="text-white/40 text-sm">
          Graba una reunión y el proyecto empieza a acumular memoria: cada reunión siguiente sabrá
          lo que se decidió en las anteriores.
        </p>
      ) : (
        <div className="space-y-2">
          {meetings.map((m) => (
            <Link
              key={m.id}
              href={`/empresa/reuniones/${m.id}`}
              className="block border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-3 transition-all group"
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-white text-sm font-medium group-hover:text-[#1AA7F0] transition-colors">
                  {m.title}
                </span>
                <span className={`px-2 py-0.5 text-[10px] rounded border ${MEETING_STATUS_COLOR[m.status]}`}>
                  {MEETING_STATUS_LABEL[m.status]}
                </span>
              </div>
              <p className="text-white/40 text-xs">
                {new Date(m.meetingDate).toLocaleDateString("es-PA")}
                {m.durationMs > 0 ? ` · ${formatDuration(m.durationMs)}` : ""}
                {m.actionItemCount > 0 ? ` · ${m.actionItemCount} pendientes` : ""}
              </p>
              {m.contextSummary && (
                <p className="text-white/60 text-xs mt-1.5 leading-relaxed line-clamp-3">
                  {m.contextSummary}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
