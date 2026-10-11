import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalUser } from "@/lib/portal/sesion";
import { proyectoDelCliente, dinero } from "@/lib/portal/datos";
import { FASE_COBRO_LABEL, FASE_ESTADO_LABEL, type FaseCobro, type FaseEstado } from "@/lib/portal/estados";
import { avanceDeFase } from "@/lib/portal/avance";
import { EstadoSistemas } from "@/components/portal/sistemas";
import { sistemasDelCliente } from "@/lib/pulso/datos";
import { Barra, Encabezado, Etiqueta, Fila, Tarjeta, TituloSeccion, Vacio, btnSecundario, fechaCorta, haceCuanto } from "@/components/portal/ui";
import { IconAtras } from "@/components/portal/iconos";

export const metadata = { title: "Proyecto" };
const ORDEN: Record<string, [string, "aviso" | "ok" | "neutro" | "peligro"]> = { enviada: ["Espera tu decisión", "aviso"], aprobada: ["Aprobada", "ok"], rechazada: ["No aprobada", "peligro"], cancelada: ["Cancelada", "neutro"] };

export default async function ProyectoCliente({ params }: { params: Promise<{ id: string }> }) {
  const p = await getPortalUser();
  const { id } = await params;
  const [x, sistemas] = await Promise.all([proyectoDelCliente(p.clientId, id), sistemasDelCliente(p.clientId)]);
  if (!x) notFound();
  const delProyecto = sistemas.filter((s) => s.projectId === x.id);
  const total = x.phases.reduce((a, f) => a + Number(f.price), 0);
  return (
    <>
      <Link href="/cliente/proyectos" className="inline-flex items-center gap-1 min-h-11 text-sm font-semibold text-fg-dim hover:text-fg"><IconAtras width={16} height={16} />Proyectos</Link>
      <Encabezado eyebrow={x.kind === "modificacion" ? "Modificación" : "Proyecto"} titulo={x.name} detalle={x.description ?? undefined}
        accion={<Link href={`/cliente/tickets/nuevo?proyecto=${x.id}&tipo=cambio`} className={btnSecundario}>Pedir un cambio</Link>} />

      <Tarjeta>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-fg-dim text-sm">Avance del proyecto</p><p className="text-fg text-4xl font-bold tabular-nums tracking-tight">{Math.round(x.avance)} %</p></div>
          <p className="text-fg-dim text-sm">{x.actual ? <>Fase actual: <b className="text-fg">{x.actual.name}</b></> : x.phases.length ? "Todas las fases terminadas" : null}</p>
        </div>
        <div className="mt-4"><Barra valor={x.avance} etiqueta={`Avance de ${x.name}`} /></div>
        <p className="mt-3 text-xs text-fg-faint">El avance se actualiza solo a medida que el equipo cierra las tareas de cada fase.</p>
      </Tarjeta>

      <EstadoSistemas sistemas={delProyecto} titulo={delProyecto.length === 1 ? "Estado del sistema" : "Estado de los sistemas"} />

      <Tarjeta>
        <TituloSeccion accion={total > 0 ? <span className="text-fg-dim text-sm">Total <b className="text-fg tabular-nums">{dinero(total)}</b></span> : undefined}>Fases</TituloSeccion>
        {x.phases.length === 0 ? (
          <Vacio titulo="Las fases todavía no están cargadas" texto="Pime las carga al aprobar la propuesta. Cada fase dice qué incluye, su precio y cuándo se paga." />
        ) : (
          <ol className="space-y-4">
            {x.phases.map((f, i) => {
              const actual = f.id === x.actual?.id;
              return (
                <li key={f.id} className={`rounded-2xl border p-4 sm:p-6 ${actual ? "border-brand bg-brand/5" : "border-line"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="text-fg-dim text-xs font-semibold uppercase tracking-wider">Fase {i + 1}</p>
                      <p className="text-fg text-lg font-bold tracking-tight break-words">{f.name}</p>
                      {f.description && <p className="text-fg-mute text-sm leading-relaxed whitespace-pre-line">{f.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end"><Etiqueta tono={f.status === "hecha" ? "ok" : actual ? "marca" : f.status === "en_revision" ? "aviso" : "neutro"}>{FASE_ESTADO_LABEL[f.status as FaseEstado] ?? f.status}</Etiqueta></div>
                  </div>
                  <div className="mt-4"><Barra valor={avanceDeFase(f)} etiqueta={`Avance de ${f.name}`} /></div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div><dt className="text-fg-dim">Avance</dt><dd className="text-fg font-semibold tabular-nums">{Math.round(avanceDeFase(f))} %</dd></div>
                    <div><dt className="text-fg-dim">Precio</dt><dd className="text-fg font-semibold tabular-nums">{Number(f.price) ? dinero(f.price) : "Incluido"}</dd></div>
                    <div><dt className="text-fg-dim">Pago</dt><dd className="text-fg font-semibold">{FASE_COBRO_LABEL[f.billingPoint as FaseCobro] ?? f.billingPoint}</dd></div>
                    <div><dt className="text-fg-dim">{f.completedAt ? "Terminó" : f.startedAt ? "Empezó" : "Plazo"}</dt><dd className="text-fg font-semibold">{f.completedAt ? fechaCorta(f.completedAt) : f.startedAt ? fechaCorta(f.startedAt) : f.estimatedDays ? `~${f.estimatedDays} días` : "—"}</dd></div>
                  </dl>
                  {f.invoice && <p className="mt-3 text-xs text-fg-dim">Facturada en <Link className="font-semibold text-brand-fg hover:underline" href="/cliente/facturas">{f.invoice.number ?? "factura"}</Link></p>}
                </li>
              );
            })}
          </ol>
        )}
      </Tarjeta>

      {x.changeOrders.length > 0 && (
        <Tarjeta>
          <TituloSeccion>Órdenes de cambio</TituloSeccion>
          <ul className="divide-y divide-line">
            {x.changeOrders.map((o) => { const [l, t] = ORDEN[o.status] ?? [o.status, "neutro"]; return <Fila key={o.id} href={`/cliente/cambios/${o.id}`} titulo={o.title} detalle={`${o.number} · ${dinero(o.total)}`} derecha={<Etiqueta tono={t}>{l}</Etiqueta>} />; })}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta>
        <TituloSeccion>Historial</TituloSeccion>
        {x.eventos.length ? (
          <ol className="space-y-4">{x.eventos.map((e) => (
            <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3"><span className="mt-2 h-2 w-2 rounded-full bg-brand" aria-hidden />
              <div className="min-w-0"><p className="text-fg text-sm font-semibold break-words">{e.title}</p>{e.detail && <p className="text-fg-dim text-sm break-words">{e.detail}</p>}<p className="text-fg-faint text-xs mt-1">{haceCuanto(e.createdAt)}</p></div></li>
          ))}</ol>
        ) : <p className="text-fg-dim text-sm">Cada avance, aprobación y entrega de este proyecto aparece aquí.</p>}
      </Tarjeta>
    </>
  );
}
