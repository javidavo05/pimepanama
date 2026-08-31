import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/meetings/transcript";
import { MEETING_STATUS_COLOR, MEETING_STATUS_LABEL } from "./status";

export const metadata = { title: "Reuniones — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function ReunionesPage() {
  const user = await getEmpresaUser();

  const meetings = await prisma.meeting.findMany({
    where: { userId: user.id },
    include: {
      project: { select: { id: true, name: true } },
      client: { select: { name: true, company: true } },
      _count: { select: { actionItems: true, speakers: true } },
    },
    orderBy: { meetingDate: "desc" },
  });

  const pendingSync = await prisma.meetingActionItem.count({
    where: { meeting: { userId: user.id }, taskId: null, kind: "TECNICO" },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Reuniones</h1>
          <p className="text-white/60 text-sm mt-0.5">
            {meetings.length} reunión{meetings.length !== 1 ? "es" : ""}
            {pendingSync > 0 && (
              <span className="text-amber-400/80"> · {pendingSync} pendiente{pendingSync !== 1 ? "s" : ""} técnico{pendingSync !== 1 ? "s" : ""} sin pasar a tareas</span>
            )}
          </p>
        </div>
        <Link
          href="/empresa/reuniones/nueva"
          className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all"
        >
          🎙️ Grabar reunión
        </Link>
      </div>

      {meetings.length === 0 ? (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-12 text-center space-y-4">
          <p className="text-white/60 font-medium">Todavía no has grabado ninguna reunión</p>
          <p className="text-white/55 text-sm max-w-md mx-auto">
            Graba la llamada y el sistema transcribe, separa quién habló, redacta la minuta
            ejecutiva y la técnica, saca los pendientes y arma el prompt para construir lo que se
            acordó.
          </p>
          <Link
            href="/empresa/reuniones/nueva"
            className="inline-block px-5 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all"
          >
            Grabar la primera
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {meetings.map((m) => (
            <Link
              key={m.id}
              href={`/empresa/reuniones/${m.id}`}
              className="bg-[#0a0a10] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-5 flex items-start gap-4 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1AA7F0]/10 border border-[#1AA7F0]/20 flex items-center justify-center text-lg shrink-0">
                🎙️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-white font-medium truncate group-hover:text-[#1AA7F0] transition-colors">
                    {m.title}
                  </h2>
                  <span className={`px-2 py-0.5 text-[10px] rounded border ${MEETING_STATUS_COLOR[m.status]}`}>
                    {MEETING_STATUS_LABEL[m.status]}
                  </span>
                </div>
                <p className="text-white/60 text-sm truncate">
                  {m.project ? m.project.name : <span className="text-amber-400/70">Sin proyecto — no acumula contexto</span>}
                  {m.client ? ` · ${m.client.name}` : ""}
                </p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="text-white/50 text-xs">
                    {new Date(m.meetingDate).toLocaleDateString("es-PA")}
                  </span>
                  {m.durationMs > 0 && (
                    <span className="text-white/50 text-xs">{formatDuration(m.durationMs)}</span>
                  )}
                  {m._count.speakers > 0 && (
                    <span className="text-white/50 text-xs">{m._count.speakers} hablantes</span>
                  )}
                  {m._count.actionItems > 0 && (
                    <span className="text-[#1AA7F0]/70 text-xs">{m._count.actionItems} pendientes</span>
                  )}
                  {m.aiCostUSD > 0 && (
                    <span className="text-[#C8A96E]/60 text-xs font-mono">
                      ${m.aiCostUSD.toFixed(3)}
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-white/50 shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
