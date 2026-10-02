import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/meetings/transcript";
import { meetingSearchFilter } from "@/lib/meetings/search";
import { MEETING_STATUS_COLOR, MEETING_STATUS_LABEL } from "./status";
import { MeetingsFilters } from "./meetings-filters";
import { DeleteMeetingButton } from "./delete-meeting-button";
import { PendingOfflineMeetings } from "./pending-offline-meetings";
import { PageHeader, btn } from "@/components/empresa/page-header";

export const metadata = { title: "Reuniones — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function ReunionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; projectId?: string; clientId?: string; status?: string }>;
}) {
  const user = await getEmpresaUser();
  const filters = await searchParams;
  const filtering = Boolean(filters.q || filters.projectId || filters.clientId || filters.status);

  const [meetings, pendingSync, projects, clients] = await Promise.all([
    prisma.meeting.findMany({
      where: meetingSearchFilter(user.id, filters),
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { name: true, company: true } },
        _count: { select: { actionItems: true, speakers: true } },
        actionItems: { select: { taskId: true, task: { select: { completed: true } } } },
      },
      orderBy: { meetingDate: "desc" },
    }),
    prisma.meetingActionItem.count({
      where: { meeting: { userId: user.id }, taskId: null, kind: "TECNICO" },
    }),
    prisma.project.findMany({
      where: { userId: user.id, meetings: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { userId: user.id, meetings: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        className="mb-6"
        title="Reuniones"
        description={
          <>
            {meetings.length} {meetings.length === 1 ? "reunión" : "reuniones"}
            {pendingSync > 0 && (
              <span className="text-warn"> · {pendingSync} pendiente{pendingSync !== 1 ? "s" : ""} técnico{pendingSync !== 1 ? "s" : ""} sin pasar a tareas</span>
            )}
          </>
        }
        actions={
          <>
            <Link href="/empresa/reuniones/notas-de-voz" className={btn.secondary}>
              Notas de voz
            </Link>
            <Link href="/empresa/reuniones/nueva" className={btn.primary}>
              🎙️ Grabar reunión
            </Link>
          </>
        }
      />

      <PendingOfflineMeetings />

      <MeetingsFilters projects={projects} clients={clients} />

      {meetings.length === 0 && filtering ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center">
          <p className="text-fg-dim font-medium">Ninguna reunión coincide con esa búsqueda</p>
          <p className="text-fg-faint text-sm mt-1">
            La búsqueda mira el título, la transcripción, las notas de contexto y los pendientes.
          </p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center space-y-4">
          <p className="text-fg-dim font-medium">Todavía no has grabado ninguna reunión</p>
          <p className="text-fg-dim text-sm max-w-md mx-auto">
            Graba la llamada y el sistema transcribe, separa quién habló, redacta la minuta
            ejecutiva y la técnica, saca los pendientes y arma el prompt para construir lo que se
            acordó.
          </p>
          <Link
            href="/empresa/reuniones/nueva"
            className="inline-block px-6 py-2 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-all"
          >
            Grabar la primera
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {meetings.map((m) => (
            // El enlace y el botón de borrar van lado a lado dentro de la tarjeta:
            // un botón anidado en un <a> navega al pulsarlo, y encimado sobre el
            // enlace tapaba el título en el celular.
            <div key={m.id} className="min-w-0 bg-panel border border-line hover:border-line-mid rounded-xl flex items-start transition-all">
            <Link
              href={`/empresa/reuniones/${m.id}`}
              className="flex-1 min-w-0 p-4 sm:p-6 pr-2 sm:pr-2 flex items-start gap-4 group"
            >
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-lg shrink-0">
                🎙️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-fg font-medium truncate min-w-0 max-w-full group-hover:text-brand-fg transition-colors">
                    {m.title}
                  </h2>
                  <span className={`px-2 py-1 text-[10px] rounded border ${MEETING_STATUS_COLOR[m.status]}`}>
                    {MEETING_STATUS_LABEL[m.status]}
                  </span>
                </div>
                <p className="text-fg-dim text-sm truncate">
                  {m.project ? m.project.name : <span className="text-warn">Sin proyecto — no acumula contexto</span>}
                  {m.client ? ` · ${m.client.name}` : ""}
                </p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="text-fg-faint text-xs">
                    {new Date(m.meetingDate).toLocaleDateString("es-PA")}
                  </span>
                  {m.durationMs > 0 && (
                    <span className="text-fg-faint text-xs">{formatDuration(m.durationMs)}</span>
                  )}
                  {m._count.speakers > 0 && (
                    <span className="text-fg-faint text-xs">{m._count.speakers} hablantes</span>
                  )}
                  {(() => {
                    // Lo que importa de los pendientes es cuánto se cumplió
                    const inTasks = m.actionItems.filter((i) => i.task);
                    const done = inTasks.filter((i) => i.task!.completed).length;
                    const toReview = m.actionItems.length - inTasks.length;
                    return (
                      <>
                        {inTasks.length > 0 && (
                          <span className="flex items-center gap-2 text-xs text-fg-dim">
                            <span className="w-12 h-1 rounded-full bg-fill-2 overflow-hidden">
                              <span
                                className="block h-full bg-ok-solid rounded-full"
                                style={{ width: `${Math.round((done / inTasks.length) * 100)}%` }}
                              />
                            </span>
                            {done}/{inTasks.length} tareas hechas
                          </span>
                        )}
                        {toReview > 0 && (
                          <span className="text-brand-fg text-xs">
                            {toReview} pendiente{toReview !== 1 ? "s" : ""} por revisar
                          </span>
                        )}
                      </>
                    );
                  })()}
                  {m.aiCostUSD > 0 && (
                    <span className="text-sand-fg text-xs font-mono">
                      ${m.aiCostUSD.toFixed(3)}
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-fg-faint shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <DeleteMeetingButton id={m.id} title={m.title} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
