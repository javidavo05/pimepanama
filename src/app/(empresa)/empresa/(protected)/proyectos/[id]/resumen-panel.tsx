/**
 * «Cómo va» del proyecto, arriba de la pestaña Resumen: avance de las fases, dinero, tareas y tickets
 * abiertos y la última reunión. Cada dato lleva a su pestaña. Todo lo que se resume aquí ya se cargó en
 * la página, el dinero incluido (la misma cuenta que la pestaña Dinero).
 */
import type { dineroDeProyecto } from "@/lib/motor/cobros";
import { avanceDeProyecto, faseActual } from "@/lib/portal/avance";
import { FASE_ESTADO_LABEL, type FaseEstado } from "@/lib/portal/estados";
import { dinero as usd } from "@/lib/portal/datos";
import { fechaCorta } from "@/lib/format-datetime";
import { IrAPestana } from "./ir-a-pestana";

type Fase = { id: string; name: string; status: string; progress: unknown; price: unknown; sortOrder: number };
type Reunion = { title: string; meetingDate: string; contextSummary: string | null };

const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
const tile = "rounded-xl bg-fill hover:bg-fill-2 px-4 py-3 min-h-16 min-w-0 text-left transition-colors";

export function ResumenProyecto({
  dinero: d, fases, tareasAbiertas, ticketsAbiertos, ultimaReunion,
}: {
  /** Dinero del proyecto (dineroDeProyecto); null en la empresa interna o si no cargó. */
  dinero: Awaited<ReturnType<typeof dineroDeProyecto>>;
  /** Fases vigentes; null si no cargaron. */
  fases: Fase[] | null;
  tareasAbiertas: number;
  ticketsAbiertos: number;
  ultimaReunion: Reunion | null;
}) {
  const avance = fases?.length ? avanceDeProyecto(fases) : null;
  const actual = fases ? faseActual(fases) : null;
  const hechas = fases?.filter((f) => f.status === "hecha").length ?? 0;

  const subtitulo = !fases
    ? "No se pudieron cargar las fases."
    : !fases.length
      ? "Sin fases todavía: agrégalas con su precio y el avance se calcula solo."
      : actual
        ? `Fase actual: ${actual.name} · ${FASE_ESTADO_LABEL[actual.status as FaseEstado] ?? actual.status}`
        : "Todas las fases están hechas.";

  const tiles: { k: string; v: string; nota: string; tab: string; tono: string }[] = [
    { k: "Avance", v: avance != null ? `${Math.round(avance)} %` : "—", nota: fases?.length ? `${hechas} de ${fases.length} ${fases.length === 1 ? "fase hecha" : "fases hechas"}` : "Sin fases", tab: "fases", tono: avance === 100 ? "text-ok" : "text-fg" },
    ...(d
      ? [{ k: "Cobrado", v: usd(d.cobrado), nota: d.presupuesto > 0 ? `de ${usd(d.presupuesto)}` : "Sin presupuesto", tab: "dinero", tono: d.cobrado > 0 ? "text-ok" : "text-fg-dim" },
         { k: "Por cobrar", v: usd(d.porCobrar), nota: d.sinFacturar > 0.005 ? `${usd(d.sinFacturar)} sin facturar` : "Todo facturado", tab: "dinero", tono: d.porCobrar > 0 ? "text-warn" : "text-fg-dim" }]
      : []),
    { k: "Tareas abiertas", v: String(tareasAbiertas), nota: tareasAbiertas ? "Ver la lista" : "Nada pendiente", tab: "tareas", tono: tareasAbiertas ? "text-fg" : "text-fg-dim" },
    { k: "Tickets abiertos", v: String(ticketsAbiertos), nota: ticketsAbiertos ? "Esperan respuesta" : "Ninguno abierto", tab: "tickets", tono: ticketsAbiertos ? "text-brand-fg" : "text-fg-dim" },
  ];

  return (
    <section aria-labelledby="como-va" className={`${card} space-y-4`}>
      <div className="min-w-0">
        <h2 id="como-va" className="text-fg text-base font-semibold tracking-tight">Cómo va</h2>
        <p className="text-fg-dim text-sm [overflow-wrap:anywhere]">{subtitulo}</p>
      </div>
      {avance != null && (
        <div className="h-2 rounded-full bg-fill-3 overflow-hidden" role="progressbar" aria-valuenow={Math.round(avance)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del proyecto">
          <div className="h-full rounded-full bg-brand origin-left" style={{ transform: `scaleX(${avance / 100})` }} />
        </div>
      )}
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 grid-fill-2-3">
        {tiles.map((t) => (
          <li key={t.k} className="min-w-0">
            <IrAPestana tab={t.tab} className={`${tile} w-full h-full`}>
              <span className="block text-fg-dim text-xs">{t.k}</span>
              <span className={`block text-base font-semibold font-mono tabular-nums truncate ${t.tono}`}>{t.v}</span>
              <span className="block text-fg-faint text-xs truncate">{t.nota}</span>
            </IrAPestana>
          </li>
        ))}
      </ul>
      <div className="border-t border-line pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-fg-dim text-xs font-semibold uppercase tracking-wider">Última reunión</h3>
          <IrAPestana tab="reuniones" className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline shrink-0">
            {ultimaReunion ? "Ver reuniones" : "Grabar o enlazar"}
          </IrAPestana>
        </div>
        {ultimaReunion ? (
          <div className="mt-1 min-w-0">
            <p className="text-fg text-sm font-medium [overflow-wrap:anywhere]">{ultimaReunion.title} · <span className="text-fg-dim font-normal">{fechaCorta(ultimaReunion.meetingDate)}</span></p>
            <p className="mt-1 text-fg-mute text-sm leading-relaxed line-clamp-4 [overflow-wrap:anywhere]">
              {ultimaReunion.contextSummary || "Sin resumen todavía: se genera al terminar de procesar la grabación."}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-fg-dim text-sm">Sin reuniones en este proyecto. Al enlazar o grabar una, su resumen aparece aquí.</p>
        )}
      </div>
    </section>
  );
}
