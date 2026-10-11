import { notFound } from "next/navigation";
import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { reglasDe, tarifaDe, formatoHoras } from "@/lib/portal/horas";
import { sugerirGarantia } from "@/lib/portal/empresa";
import { dinero } from "@/lib/portal/datos";
import { TICKET_ESTADO_LABEL, TICKET_TIPO_LABEL, type TicketEstado, type TicketTipo } from "@/lib/portal/estados";
import { EstimarTicket, GarantiaToggle, HorasForm, ResponderTicket } from "@/components/empresa/clientes/formularios";
import { ZonaLinea } from "@/components/empresa/clientes/zona-linea";

export const metadata = { title: "Ticket — Pime Suite" };
const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
const cuando = (d: Date) => new Date(d).toLocaleString("es-PA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Panama" });

export default async function TicketEquipo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getEmpresaUser();
  const t = await prisma.ticket.findFirst({
    where: { id, userId: u.id },
    include: {
      client: { select: { id: true, name: true, company: true, brandLine: true, hourlyRate: true } },
      project: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { clientUser: { select: { fullName: true, email: true } }, empresaUser: { select: { fullName: true, email: true } }, attachments: { select: { id: true, fileName: true, contentType: true } } } },
      timeEntries: { orderBy: { workDate: "desc" }, select: { id: true, minutes: true, billedMinutes: true, amount: true, billable: true, workDate: true, note: true, invoiceId: true } },
      changeOrders: { select: { id: true, number: true, status: true } },
    },
  });
  if (!t) notFound();
  const reglas = reglasDe(u.config);
  const tarifa = tarifaDe(t.client, reglas);
  const garantiaSugerida = !t.isWarranty && (await sugerirGarantia(u, t.id));
  const minutos = t.timeEntries.reduce((a, e) => a + e.minutes, 0);
  const cobrado = t.timeEntries.reduce((a, e) => a + Number(e.amount), 0);

  return (
    <ZonaLinea linea={t.client.brandLine}>
    <div className="max-w-6xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-fg-dim min-w-0" aria-label="Ruta">
        <Link href="/empresa/tickets" className="inline-flex items-center min-h-11 sm:min-h-8 hover:text-fg-mute">Tickets</Link><span aria-hidden>/</span>
        <Link href={`/empresa/clientes/${t.client.id}`} className="truncate hover:text-fg-mute">{t.client.company || t.client.name}</Link>
      </nav>
      <header className={card}>
        <p className="text-fg-dim text-xs font-semibold uppercase tracking-widest">{t.number} · {TICKET_TIPO_LABEL[t.kind as TicketTipo] ?? t.kind} · {t.source === "portal" ? "desde su cuenta" : t.source === "sistema" ? "alerta del sistema" : "abierto por Pime"}</p>
        <h1 className="mt-1 text-fg text-2xl font-semibold tracking-tight break-words">{t.title}</h1>
        <p className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full px-2.5 py-1 font-semibold bg-brand/10 text-brand-fg">{TICKET_ESTADO_LABEL[t.status as TicketEstado] ?? t.status}</span>
          {t.project && <Link href={`/empresa/proyectos/${t.project.id}`} className="rounded-full px-2.5 py-1 font-semibold bg-fill-2 text-fg-dim hover:text-fg">{t.project.name}</Link>}
          {t.isWarranty && <span className="rounded-full px-2.5 py-1 font-semibold bg-ok/10 text-ok">Garantía</span>}
          {t.estimatedMinutes && <span className="rounded-full px-2.5 py-1 font-semibold bg-fill-2 text-fg-dim">Estimado {formatoHoras(t.estimatedMinutes)} · {t.estimateStatus === "pendiente" ? "esperando al cliente" : t.estimateStatus === "aprobado" ? "aprobado" : t.estimateStatus === "rechazado" ? "no aprobado" : "sin aprobación"}</span>}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <section className={`${card} lg:col-span-2`}>
          <h2 className="text-fg text-base font-semibold">Conversación</h2>
          <ol className="mt-4 space-y-4">
            {t.messages.map((m) => (
              <li key={m.id} className={m.authorType === "sistema" ? "text-center" : ""}>
                {m.authorType === "sistema" ? (
                  <p className="inline-block rounded-full bg-fill-2 px-4 py-1.5 text-xs text-fg-dim">{m.body} · {cuando(m.createdAt)}</p>
                ) : (
                  <div className={`rounded-xl border p-4 ${m.internal ? "border-warn/40 bg-warn/5" : m.authorType === "pime" ? "border-brand/25 bg-brand/5" : "border-line bg-fill"}`}>
                    <p className="text-xs font-semibold text-fg-dim">{m.internal ? "Nota interna · " : ""}{m.authorType === "pime" ? m.empresaUser?.fullName || m.empresaUser?.email || "Pime" : m.clientUser?.fullName || m.clientUser?.email || "Cliente"} · {cuando(m.createdAt)}</p>
                    <p className="mt-2 text-sm text-fg whitespace-pre-wrap break-words">{m.body}</p>
                    {m.attachments.length > 0 && (
                      <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">{m.attachments.map((a) => (
                        <li key={a.id}><a href={`/api/cliente/adjuntos/${a.id}`} target="_blank" rel="noopener" className="block rounded-lg border border-line overflow-hidden hover:border-brand">
                          {a.contentType.startsWith("image/")
                            // eslint-disable-next-line @next/next/no-img-element -- adjunto privado
                            ? <img src={`/api/cliente/adjuntos/${a.id}`} alt={a.fileName} loading="lazy" className="h-24 w-full object-cover" />
                            : <span className="grid h-24 place-items-center text-xs text-fg-dim">PDF</span>}
                          <span className="block truncate px-2 py-1 text-xs text-fg-dim">{a.fileName}</span></a></li>
                      ))}</ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-6 border-t border-line pt-6"><ResponderTicket ticketId={t.id} estadoActual={t.status} /></div>
        </section>

        <aside className="space-y-6 min-w-0">
          <section className={card}>
            <h2 className="text-fg text-base font-semibold">Horas</h2>
            <p className="mt-1 text-sm text-fg-dim">{minutos ? <>Trabajado {formatoHoras(minutos)} · se cobra <span className="font-mono text-fg">{dinero(cobrado)}</span></> : `Tarifa ${dinero(tarifa)}/h`}</p>
            {t.timeEntries.length > 0 && <ul className="mt-3 space-y-1 text-xs text-fg-dim">{t.timeEntries.slice(0, 8).map((e) => <li key={e.id} className="flex justify-between gap-2"><span className="truncate">{new Date(e.workDate).toLocaleDateString("es-PA", { timeZone: "UTC" })} · {formatoHoras(e.minutes)}{e.note ? ` · ${e.note}` : ""}</span><span className="font-mono shrink-0">{e.invoiceId ? "facturado" : e.billable ? dinero(e.amount) : "sin cobro"}</span></li>)}</ul>}
            <div className="mt-4"><HorasForm clientId={t.client.id} ticketId={t.id} projectId={t.project?.id} tarifa={tarifa} garantia={t.isWarranty} /></div>
          </section>
          <section className={card}>
            <h2 className="text-fg text-base font-semibold">Estimado</h2>
            <div className="mt-3"><EstimarTicket ticketId={t.id} umbralHoras={reglas.aprobacionHoras} /></div>
          </section>
          <section className={card}>
            <h2 className="text-fg text-base font-semibold">Garantía</h2>
            <p className="mt-1 text-sm text-fg-dim">{t.isWarranty ? "Este ticket no se cobra." : garantiaSugerida ? "La entrega de este proyecto está dentro de los 90 días de garantía. Si es una falla nuestra, márcalo." : "Fallas nuestras dentro de la garantía no se cobran."}</p>
            <div className="mt-3"><GarantiaToggle ticketId={t.id} activa={t.isWarranty} /></div>
          </section>
          {t.project && (
            <section className={card}>
              <h2 className="text-fg text-base font-semibold">¿Es un cambio con precio?</h2>
              <p className="mt-1 text-sm text-fg-dim">Arma una orden de cambio con fases y precio. El cliente la aprueba en su cuenta.</p>
              <Link href={`/empresa/proyectos/${t.project.id}?orden=nueva&ticket=${t.id}#ordenes`} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-line-mid px-4 text-sm font-semibold text-fg-mute hover:text-fg">Crear orden de cambio</Link>
              {t.changeOrders.length > 0 && <p className="mt-2 text-xs text-fg-dim">Órdenes: {t.changeOrders.map((o) => `${o.number} (${o.status})`).join(", ")}</p>}
            </section>
          )}
        </aside>
      </div>
    </div>
    </ZonaLinea>
  );
}
