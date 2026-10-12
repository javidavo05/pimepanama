import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { TICKET_ABIERTOS, TICKET_ESTADO_LABEL, etiquetaTipoTicket, type TicketEstado } from "@/lib/portal/estados";
import { PageHeader, btn, seg } from "@/components/empresa/page-header";
import { TicketsFiltros } from "./filtros";

export const metadata = { title: "Tickets — Pime Suite" };

const FILTROS = [
  ["responder", "Por responder"], ["abiertos", "Abiertos"], ["cliente", "Esperan al cliente"], ["cerrados", "Resueltos"],
] as const;

export default async function TicketsEquipo({ searchParams }: { searchParams: Promise<{ f?: string; cliente?: string; proyecto?: string; internos?: string }> }) {
  const u = await getEmpresaUser();
  const { f = "responder", cliente, proyecto, internos } = await searchParams;
  const soloInternos = internos === "1";
  const [todos, proyectos] = await Promise.all([prisma.ticket.findMany({
    where: { userId: u.id, ...(cliente ? { clientId: cliente } : {}), ...(proyecto ? { projectId: proyecto } : {}), ...(soloInternos ? { client: { internal: true } } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 300,
    select: { id: true, number: true, title: true, status: true, kind: true, priority: true, updatedAt: true, lastClientActivityAt: true, lastPimeActivityAt: true, estimateStatus: true, isWarranty: true, client: { select: { id: true, name: true, company: true, brandLine: true, internal: true } }, project: { select: { name: true } }, _count: { select: { attachments: true } } },
  }),
    // Proyectos con tickets, para el filtro (los de la empresa interna primero).
    prisma.project.findMany({
      where: { userId: u.id, tickets: { some: {} } },
      select: { id: true, name: true, client: { select: { internal: true } }, clients: { select: { client: { select: { internal: true } } } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const opcionesProyecto = proyectos
    .map((p) => ({ id: p.id, nombre: p.name, interno: p.clients.some((c) => c.client.internal) || !!p.client?.internal }))
    .sort((a, b) => Number(b.interno) - Number(a.interno));
  const extra = `${cliente ? `&cliente=${cliente}` : ""}${proyecto ? `&proyecto=${proyecto}` : ""}${soloInternos ? "&internos=1" : ""}`;
  // «Por responder»: abiertos donde lo último lo escribió el cliente (o nadie de Pime todavía).
  const responder = (t: (typeof todos)[number]) => (TICKET_ABIERTOS as string[]).includes(t.status) && t.status !== "esperando_cliente" && (!t.lastPimeActivityAt || (t.lastClientActivityAt && t.lastClientActivityAt > t.lastPimeActivityAt));
  const grupos = {
    responder: todos.filter(responder),
    abiertos: todos.filter((t) => (TICKET_ABIERTOS as string[]).includes(t.status)),
    cliente: todos.filter((t) => t.status === "esperando_cliente"),
    cerrados: todos.filter((t) => t.status === "resuelto" || t.status === "cerrado"),
  } as const;
  const lista = grupos[(f in grupos ? f : "responder") as keyof typeof grupos];
  const nombreCliente = cliente ? todos[0]?.client.company || todos[0]?.client.name : null;
  const nuevoHref = `/empresa/tickets/nuevo${proyecto ? `?projectId=${proyecto}` : cliente ? `?clientId=${cliente}` : ""}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title={nombreCliente ? `Tickets · ${nombreCliente}` : "Tickets"} description="Soporte, cambios y pedidos de los clientes. Lo que entra por su cuenta llega aquí con aviso." actions={<Link href={nuevoHref} className={btn.primary}>+ Ticket</Link>} />
      <TicketsFiltros proyectos={opcionesProyecto} />
      <div className={seg.group} role="tablist">
        {FILTROS.map(([k, label]) => (
          <Link key={k} href={`/empresa/tickets?f=${k}${extra}`} className={seg.item(f === k)} role="tab" aria-selected={f === k}>
            {label} <span className="font-mono text-xs opacity-70">{grupos[k].length}</span>
          </Link>
        ))}
      </div>
      {lista.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center"><p className="text-fg font-medium">{f === "responder" ? "Estás al día: no hay tickets esperando respuesta." : "No hay tickets en esta vista."}</p><p className="mt-2 text-fg-dim text-sm">{soloInternos ? "Los errores, mejoras y tareas de los productos de Pime aparecen aquí. Ábrelos desde cada proyecto o con «+ Ticket»." : "Los clientes abren tickets desde su cuenta en pimepanama.com/cliente."}</p></div>
      ) : (
        <ul className="bg-panel border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {lista.map((t) => (
            <li key={t.id}>
              <Link href={`/empresa/tickets/${t.id}`} className="grid gap-2 px-4 sm:px-6 py-4 hover:bg-fill sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
                <span className="min-w-0">
                  <span className="block text-fg font-medium truncate">{t.priority === "urgente" || t.priority === "alta" ? "● " : ""}{t.title}</span>
                  <span className="block text-fg-dim text-xs truncate">{t.number} · {etiquetaTipoTicket(t.kind)}{t._count.attachments ? ` · ${t._count.attachments} adjunto(s)` : ""}{t.isWarranty ? " · garantía" : ""}{t.estimateStatus === "pendiente" ? " · estimado por aprobar" : ""}</span>
                </span>
                <span className="text-sm text-fg-mute truncate">{t.client.company || t.client.name}{t.client.internal ? " · Interna" : t.client.brandLine === "premium" ? " · Premium" : ""}{t.project ? <span className="block text-xs text-fg-dim truncate">{t.project.name}</span> : null}</span>
                <span className={`justify-self-start sm:justify-self-end rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${responder(t) ? "bg-warn/10 text-warn" : t.status === "resuelto" || t.status === "cerrado" ? "bg-fill-2 text-fg-dim" : "bg-brand/10 text-brand-fg"}`}>{responder(t) ? "Por responder" : TICKET_ESTADO_LABEL[t.status as TicketEstado] ?? t.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
