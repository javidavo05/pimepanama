import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalUser } from "@/lib/portal/sesion";
import { ticketDelCliente, dinero } from "@/lib/portal/datos";
import { prisma } from "@/lib/prisma";
import { TICKET_ESTADO_LABEL, TICKET_TIPO_LABEL, type TicketEstado, type TicketTipo } from "@/lib/portal/estados";
import { formatoHoras, reglasDe, tarifaDe } from "@/lib/portal/horas";
import { Encabezado, Etiqueta, Tarjeta, TituloSeccion, fechaCorta, haceCuanto } from "@/components/portal/ui";
import { IconAtras } from "@/components/portal/iconos";
import { ResponderForm, DecidirEstimado } from "./ticket-forms";

export const metadata = { title: "Ticket" };

export default async function TicketCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const p = await getPortalUser();
  const [{ id }, { nuevo }] = await Promise.all([params, searchParams]);
  const t = await ticketDelCliente(p.clientId, id);
  if (!t) notFound();
  const config = await prisma.companyConfig.findFirst({ where: { users: { some: { id: p.client.userId } } } });
  const reglas = reglasDe(config);
  const tarifa = tarifaDe({ brandLine: p.client.brandLine }, reglas);
  const horas = t.timeEntries.reduce((a, e) => a + e.billedMinutes, 0);
  const costo = t.timeEntries.reduce((a, e) => a + Number(e.amount), 0);
  const cerrado = t.status === "cerrado" || t.status === "resuelto";

  return (
    <>
      <Link href="/cliente/tickets" className="inline-flex items-center gap-1 text-sm font-semibold text-fg-dim hover:text-fg"><IconAtras width={16} height={16} />Tickets</Link>
      <Encabezado eyebrow={`${t.number} · ${TICKET_TIPO_LABEL[t.kind as TicketTipo] ?? t.kind}`} titulo={t.title}
        detalle={<>Abierto el {fechaCorta(t.createdAt)}{t.project ? <> · {t.project.name}</> : null}</>}
        accion={<Etiqueta tono={t.status === "esperando_cliente" ? "aviso" : cerrado ? "ok" : "marca"}>{TICKET_ESTADO_LABEL[t.status as TicketEstado] ?? t.status}</Etiqueta>} />
      {nuevo && <p className="rounded-xl bg-ok/10 text-ok px-4 py-3 text-sm font-semibold" role="status">Ticket enviado. Te avisamos por correo cuando Pime responda.</p>}

      {t.estimateStatus === "pendiente" && t.estimatedMinutes && (
        <Tarjeta className="border-sand/60 bg-sand/10">
          <TituloSeccion>Espera tu aprobación</TituloSeccion>
          <p className="text-fg-mute text-sm leading-relaxed">Estimamos <b className="text-fg">{formatoHoras(t.estimatedMinutes)}</b> de trabajo, unos <b className="text-fg">{dinero((t.estimatedMinutes / 60) * tarifa)}</b> a {dinero(tarifa)} la hora. Empezamos cuando lo apruebes.</p>
          <DecidirEstimado ticketId={t.id} />
        </Tarjeta>
      )}

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <Tarjeta className="lg:col-span-2">
          <TituloSeccion>Conversación</TituloSeccion>
          <ol className="space-y-6">
            {t.messages.map((m) => {
              const dePime = m.authorType === "pime", sistema = m.authorType === "sistema";
              return (
                <li key={m.id} className={sistema ? "text-center" : ""}>
                  {sistema ? (
                    <p className="inline-block rounded-full bg-fill-2 px-4 py-2 text-xs text-fg-dim">{m.body} · {haceCuanto(m.createdAt)}</p>
                  ) : (
                    <div className={`rounded-2xl p-4 ${dePime ? "bg-brand/5 border border-brand/20" : "bg-fill border border-line"}`}>
                      <p className="text-xs font-semibold text-fg-dim mb-2">{dePime ? `${m.empresaUser?.fullName || "Equipo"} · Pime` : m.clientUser?.fullName || m.clientUser?.email || "Tú"} · {haceCuanto(m.createdAt)}</p>
                      <p className="text-fg text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                      {m.attachments.length > 0 && (
                        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {m.attachments.map((a) => (
                            <li key={a.id}>
                              <a href={`/api/cliente/adjuntos/${a.id}`} target="_blank" rel="noopener" className="block rounded-xl border border-line overflow-hidden bg-panel hover:border-brand">
                                {a.contentType.startsWith("image/")
                                  // eslint-disable-next-line @next/next/no-img-element -- archivo privado servido por la API
                                  ? <img src={`/api/cliente/adjuntos/${a.id}`} alt={a.fileName} loading="lazy" className="h-28 w-full object-cover" />
                                  : <span className="grid h-28 place-items-center text-xs font-semibold text-fg-dim">PDF</span>}
                                <span className="block truncate px-3 py-2 text-xs text-fg-dim">{a.fileName}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="mt-8 border-t border-line pt-6">
            <ResponderForm ticketId={t.id} cerrado={cerrado} />
          </div>
        </Tarjeta>
        <Tarjeta>
          <TituloSeccion>Tiempo y costo</TituloSeccion>
          {t.isWarranty ? (
            <p className="text-sm text-fg-mute leading-relaxed">Este ticket está <b className="text-fg">en garantía</b>: no se cobra.</p>
          ) : horas ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-fg-dim">Horas registradas</dt><dd className="text-fg font-semibold tabular-nums">{formatoHoras(horas)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-fg-dim">Costo</dt><dd className="text-fg font-semibold tabular-nums">{dinero(costo)}</dd></div>
              <p className="text-xs text-fg-faint">Se suma a la factura de soporte del mes.</p>
            </dl>
          ) : (
            <p className="text-sm text-fg-dim leading-relaxed">Todavía no hay horas registradas. Tu tarifa es {dinero(tarifa)} la hora, en bloques de {reglas.redondeoMinutos} minutos.</p>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
