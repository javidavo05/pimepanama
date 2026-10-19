import Link from "next/link";
import { proyectoDelCliente, dinero } from "@/lib/portal/datos";
import { FASE_COBRO_LABEL, FASE_ESTADO_LABEL, type FaseCobro, type FaseEstado } from "@/lib/portal/estados";
import { avanceDeFase } from "@/lib/portal/avance";
import { EstadoSistemas } from "./sistemas";
import { AccesoSistema } from "./acceso-sistema";
import { sistemasDelCliente } from "@/lib/pulso/datos";
import { Anillo, Barra, BloqueOscuro, Cifra, Encabezado, Etiqueta, Eyebrow, Fila, Tarjeta, TituloSeccion, Vacio, btnPrincipal, btnSecundario, enlace, fechaCorta, haceCuanto } from "./ui";
import { IconFlecha } from "./iconos";
import { VerCambio } from "./ver-cambio";

/**
 * El alcance del proyecto: tres líneas y «Ver el alcance completo». La propuesta entera como párrafo gris bajo el
 * título era un muro de texto.
 */
function LineaDeTiempo({ eventos }: { eventos: { id: string; title: string; detail: string | null; createdAt: Date; url: string | null }[] }) {
  return (
    <ol className="p-tiempo">{eventos.map((e, i) => (
      <li key={e.id} style={{ "--i": i } as React.CSSProperties}><span className="pt" aria-hidden />
        <div className="min-w-0">
          <p className="text-fg text-sm font-semibold break-words">{e.title}</p>
          {e.detail && <p className="text-fg-dim text-sm break-words">{e.detail}</p>}
          <div className="flex flex-wrap items-center gap-x-4"><p className="text-fg-faint text-xs">{haceCuanto(e.createdAt)}</p><VerCambio url={e.url} /></div>
        </div>
      </li>
    ))}</ol>
  );
}

function Alcance({ texto }: { texto: string }) {
  return (
    <details className="p-in group max-w-3xl" style={{ "--i": 1 } as React.CSSProperties}>
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <span className="text-fg-mute text-base leading-relaxed line-clamp-3 group-open:line-clamp-none whitespace-pre-line">{texto}</span>
        <span className="p-link mt-2 inline-flex items-center gap-1 min-h-11 text-sm font-semibold"><span className="group-open:hidden">Ver el alcance completo</span><span className="hidden group-open:inline">Ver menos</span></span>
      </summary>
    </details>
  );
}

const ORDEN: Record<string, [string, "aviso" | "ok" | "neutro" | "peligro"]> = { enviada: ["Espera tu decisión", "aviso"], aprobada: ["Aprobada", "ok"], rechazada: ["No aprobada", "peligro"], cancelada: ["Cancelada", "neutro"] };

/**
 * Detalle completo de un proyecto del cliente. Lo usan la ficha del proyecto y la pestaña Proyectos cuando
 * hay un solo proyecto activo: así esa pestaña nunca queda en una lista de una tarjeta.
 * Devuelve null si el proyecto no es del cliente.
 */
export async function ProyectoDetalle({ clientId, id, eyebrow }: { clientId: string; id: string; eyebrow?: string }) {
  const [x, sistemas] = await Promise.all([proyectoDelCliente(clientId, id), sistemasDelCliente(clientId)]);
  if (!x) return null;
  const delProyecto = sistemas.filter((s) => s.projectId === x.id);
  const total = x.phases.reduce((a, f) => a + Number(f.price), 0);
  return (
    <>
      <Encabezado eyebrow={eyebrow ?? (x.kind === "modificacion" ? "Modificación" : "Proyecto")} titulo={x.name}
        accion={<Link href={`/cliente/tickets/nuevo?proyecto=${x.id}&tipo=cambio`} className={btnSecundario}>Pedir un cambio</Link>} />
      {x.description && <Alcance texto={x.description} />}

      <AccesoSistema liveUrl={x.liveUrl} accesos={x.accesos} i={1} titulo="Tus sistemas y accesos" />

      <BloqueOscuro i={1}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Anillo valor={x.avance} tam={128} grosor={6} etiqueta={`Avance de ${x.name}`}>
            <Cifra texto={`${Math.round(x.avance)}`} className="text-4xl font-extrabold tracking-tight" demora={200} />
            <span className="block p-ink-3 text-xs font-semibold">%</span>
          </Anillo>
          <div className="min-w-0 flex-1 space-y-3">
            <Eyebrow>Avance del proyecto</Eyebrow>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight break-words">{x.actual ? <>Ahora: <span className="p-ink-acc">{x.actual.name}</span></> : x.phases.length ? "Todas las fases terminadas" : "Las fases todavía no están cargadas"}</p>
            {x.phases.length > 0 && <p className="p-ink-2 text-sm">{x.phases.filter((f) => f.status === "hecha").length} de {x.phases.length} fases terminadas{total > 0 ? ` · inversión total ${dinero(total)}` : ""}</p>}
            <p className="p-ink-3 text-xs">El avance se actualiza solo a medida que el equipo cierra las tareas de cada fase.</p>
          </div>
        </div>
      </BloqueOscuro>

      <EstadoSistemas sistemas={delProyecto} titulo={delProyecto.length === 1 ? "Estado del sistema" : "Estado de los sistemas"} />

      <Tarjeta i={2}>
        <TituloSeccion accion={total > 0 ? <span className="text-fg-dim text-sm">Total <b className="text-fg tabular-nums">{dinero(total)}</b></span> : undefined}>Fases</TituloSeccion>
        {x.phases.length === 0 ? (
          <Vacio titulo="Las fases todavía no están cargadas" texto="Pime las carga al aprobar la propuesta. Cada fase dice qué incluye, su precio y cuándo se paga." />
        ) : (
          <ol className="p-lista grid gap-4">
            {x.phases.map((f, i) => {
              const actual = f.id === x.actual?.id;
              return (
                <li key={f.id} data-tono={f.status === "hecha" ? "ok" : actual ? "marca" : f.status === "en_revision" ? "aviso" : "neutro"} style={{ "--i": i } as React.CSSProperties} className={`p-fase rounded-xl border p-4 sm:p-6 transition-colors ${actual ? "border-brand bg-brand/5" : "border-line hover:border-line-loud"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="p-eyebrow">Fase {i + 1}</p>
                      <p className="text-fg text-lg font-bold tracking-tight break-words">{f.name}</p>
                      {f.description && <p className="text-fg-mute text-sm leading-relaxed whitespace-pre-line">{f.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end"><Etiqueta tono={f.status === "hecha" ? "ok" : actual ? "marca" : f.status === "en_revision" ? "aviso" : "neutro"}>{FASE_ESTADO_LABEL[f.status as FaseEstado] ?? f.status}</Etiqueta></div>
                  </div>
                  <div className="mt-4"><Barra valor={avanceDeFase(f)} etiqueta={`Avance de ${f.name}`} viva={actual} i={i} /></div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div><dt className="text-fg-dim">Avance</dt><dd className="text-fg font-semibold tabular-nums">{Math.round(avanceDeFase(f))} %</dd></div>
                    <div><dt className="text-fg-dim">Precio</dt><dd className="text-fg font-bold">{Number(f.price) ? <Cifra texto={dinero(f.price)} moneda demora={300 + i * 80} /> : "Incluido"}</dd></div>
                    <div><dt className="text-fg-dim">Pago</dt><dd className="text-fg font-semibold">{FASE_COBRO_LABEL[f.billingPoint as FaseCobro] ?? f.billingPoint}</dd></div>
                    <div><dt className="text-fg-dim">{f.completedAt ? "Terminó" : f.startedAt ? "Empezó" : "Plazo"}</dt><dd className="text-fg font-semibold">{f.completedAt ? fechaCorta(f.completedAt) : f.startedAt ? fechaCorta(f.startedAt) : f.estimatedDays ? `~${f.estimatedDays} días` : "—"}</dd></div>
                  </dl>
                  {f.reviewUrl && (
                    <a href={f.reviewUrl} target="_blank" rel="noopener" className={`mt-4 ${f.status === "en_revision" ? btnPrincipal : btnSecundario}`}>
                      {f.status === "en_revision" ? "Revisar esta fase en el sistema" : "Ver en el sistema"}<IconFlecha width={16} height={16} />
                    </a>
                  )}
                  {f.invoice && <p className="mt-3 text-xs text-fg-dim">Facturada en <Link className={enlace} href="/cliente/facturas">{f.invoice.number ?? "factura"}</Link></p>}
                </li>
              );
            })}
          </ol>
        )}
      </Tarjeta>

      {x.changeOrders.length > 0 && (
        <Tarjeta>
          <TituloSeccion>Órdenes de cambio</TituloSeccion>
          <ul className="p-lista divide-y divide-line">
            {x.changeOrders.map((o, i) => { const [l, t] = ORDEN[o.status] ?? [o.status, "neutro"]; return <Fila key={o.id} i={i} tono={t} href={`/cliente/cambios/${o.id}`} titulo={o.title} detalle={`${o.number} · ${dinero(o.total)}`} derecha={<Etiqueta tono={t}>{l}</Etiqueta>} />; })}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta>
        <TituloSeccion>Historial</TituloSeccion>
        {x.eventos.length ? (
          <>
            <LineaDeTiempo eventos={x.eventos.slice(0, 8)} />
            {x.eventos.length > 8 && (
              <details className="group mt-2">
                <summary className="p-link list-none cursor-pointer inline-flex items-center min-h-11 text-sm font-semibold [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">Ver todo el historial ({x.eventos.length})</span><span className="hidden group-open:inline">Ver menos</span></summary>
                <LineaDeTiempo eventos={x.eventos.slice(8)} />
              </details>
            )}
          </>
        ) : <p className="text-fg-dim text-sm">Cada avance, aprobación y entrega de este proyecto aparece aquí.</p>}
      </Tarjeta>
    </>
  );
}
