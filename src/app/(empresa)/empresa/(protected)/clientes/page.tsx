import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { saldoCliente } from "@/lib/portal/saldo";
import { dinero, fasesVigentes, FASE_COBRABLE } from "@/lib/portal/datos";
import { FASE_INICIADA } from "@/lib/portal/saldo";
import { TICKET_ABIERTOS } from "@/lib/portal/estados";
import { PageHeader, btn } from "@/components/empresa/page-header";

export const metadata = { title: "Clientes — Pime Suite" };

/** Teléfono: todo apilado. Mediano: nombre, línea y proyectos a la izquierda y saldo a la derecha. Ancho: 4 columnas fijas. */
const COLUMNAS = "md:grid-cols-[minmax(0,1fr)_128px] xl:grid-cols-[minmax(0,1fr)_192px_176px_128px]";

const FILTROS = [
  { id: "", label: "Todos" },
  { id: "mios", label: "Mis clientes" },
  { id: "saldo", label: "Con saldo" },
  { id: "tickets", label: "Tickets abiertos" },
  { id: "proyectos", label: "Proyectos en curso" },
  { id: "premium", label: "Premium" },
] as const;
const ORDENES = [
  { id: "", label: "Recientes" },
  { id: "az", label: "A–Z" },
  { id: "saldo", label: "Mayor saldo" },
] as const;
type Filtro = (typeof FILTROS)[number]["id"];
type Orden = (typeof ORDENES)[number]["id"];

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string; orden?: string }> }) {
  const u = await getEmpresaUser();
  const sp = await searchParams;
  const busca = sp.q?.trim();
  const filtro = (FILTROS.some((f) => f.id === sp.filtro) ? sp.filtro : "") as Filtro;
  const orden = (ORDENES.some((o) => o.id === sp.orden) ? sp.orden : "") as Orden;
  // Último movimiento de cada cliente: lo más reciente entre su ficha, documentos, pagos, tickets y proyectos.
  // Las cinco consultas van juntas: cuenta el viaje a la base, no las filas.
  const maxPor = (rows: { clientId: string | null; _max: { updatedAt: Date | null } }[]) => new Map(rows.map((r) => [r.clientId, r._max.updatedAt?.getTime() ?? 0]));
  const [clientes, mDocs, mPagos, mTickets, mProyectos] = await Promise.all([prisma.client.findMany({
    where: { userId: u.id, archivedAt: null, ...(busca ? { OR: [{ name: { contains: busca, mode: "insensitive" } }, { company: { contains: busca, mode: "insensitive" } }, { email: { contains: busca, mode: "insensitive" } }, { ruc: { contains: busca } }] } : {}) },
    select: {
      id: true, name: true, company: true, email: true, brandLine: true, internal: true, updatedAt: true, responsableId: true,
      documents: { where: { type: "FACTURA" }, select: { id: true, status: true, total: true, amountPaid: true } },
      payments: { select: { documentId: true, phaseId: true, amount: true, status: true } },
      // Fases iniciadas sin factura: se deben igual (saldo.ts).
      projects: { where: { status: { not: "CANCELLED" } }, select: { phases: { where: { AND: [fasesVigentes, { status: { in: [...FASE_INICIADA] } }] }, select: FASE_COBRABLE } } },
      tickets: { where: { status: { in: TICKET_ABIERTOS } }, select: { id: true } },
      portalUsers: { where: { status: { not: "revocado" } }, select: { status: true } },
      _count: { select: { projects: { where: { status: "ACTIVE" } }, projectLinks: { where: { project: { status: "ACTIVE" } } } } },
    },
  }),
    prisma.document.groupBy({ by: ["clientId"], where: { userId: u.id, clientId: { not: null } }, _max: { updatedAt: true } }).then(maxPor),
    prisma.payment.groupBy({ by: ["clientId"], where: { userId: u.id, clientId: { not: null } }, _max: { updatedAt: true } }).then(maxPor),
    prisma.ticket.groupBy({ by: ["clientId"], where: { userId: u.id }, _max: { updatedAt: true } }).then(maxPor),
    prisma.project.groupBy({ by: ["clientId"], where: { userId: u.id, clientId: { not: null } }, _max: { updatedAt: true } }).then(maxPor),
  ]);
  const todas = clientes.map((c) => ({
    ...c,
    saldo: saldoCliente(c.documents, c.payments, c.projects.flatMap((p) => p.phases)),
    proyectos: Math.max(c._count.projects, c._count.projectLinks),
    movimiento: Math.max(c.updatedAt.getTime(), ...[mDocs, mPagos, mTickets, mProyectos].map((m) => m.get(c.id) ?? 0)),
  }));
  // Lo de la empresa interna no es dinero por cobrar.
  const porCobrar = todas.filter((c) => !c.internal).reduce((a, c) => a + c.saldo.pendiente, 0);
  const externos = todas.filter((c) => !c.internal).length;

  const pasa = (c: (typeof todas)[number]) =>
    // «Mis clientes»: los que tengo a cargo (el dueño, también los que no tienen responsable).
    filtro === "mios" ? c.responsableId === u.miembro.id || (u.miembro.esDueno && !c.responsableId)
    : filtro === "saldo" ? !c.internal && c.saldo.pendiente > 0
    : filtro === "tickets" ? c.tickets.length > 0
    : filtro === "proyectos" ? c.proyectos > 0
    : filtro === "premium" ? !c.internal && c.brandLine === "premium"
    : true;
  const nombre = (c: (typeof todas)[number]) => (c.company || c.name).toLocaleLowerCase("es");
  const filas = todas.filter(pasa).sort((a, b) =>
    // La empresa interna va arriba, separada de los clientes.
    Number(b.internal) - Number(a.internal) ||
    (orden === "az" ? nombre(a).localeCompare(nombre(b), "es")
      : orden === "saldo" ? b.saldo.pendiente - a.saldo.pendiente || b.movimiento - a.movimiento
      : b.movimiento - a.movimiento));

  const href = (cambio: { filtro?: string; orden?: string }) => {
    const p = new URLSearchParams();
    if (busca) p.set("q", busca);
    const f = cambio.filtro ?? filtro;
    const o = cambio.orden ?? orden;
    if (f) p.set("filtro", f);
    if (o) p.set("orden", o);
    const qs = p.toString();
    return `/empresa/clientes${qs ? `?${qs}` : ""}`;
  };
  const chip = (activo: boolean) =>
    `inline-flex shrink-0 items-center min-h-11 sm:min-h-10 px-4 rounded-full border text-sm font-semibold ${activo ? "border-brand bg-brand/10 text-brand-fg" : "border-line-mid text-fg-mute hover:text-fg"}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Clientes" description={<>{externos} {externos === 1 ? "cliente" : "clientes"} · Por cobrar <span className="font-mono text-fg">{dinero(porCobrar)}</span></>} actions={<Link href="/empresa/clientes/nuevo" className={btn.primary}>+ Nuevo cliente</Link>} />
      <div className="space-y-4">
        <form className="flex gap-2" role="search">
          <input name="q" defaultValue={busca} placeholder="Buscar por nombre, empresa, correo o RUC" aria-label="Buscar clientes" className="w-full min-h-11 rounded-lg border border-line-mid bg-panel px-3 text-base sm:text-sm text-fg placeholder:text-fg-trace focus:outline-none focus:border-brand" />
          {filtro && <input type="hidden" name="filtro" value={filtro} />}
          {orden && <input type="hidden" name="orden" value={orden} />}
          <button className={btn.secondary}>Buscar</button>
        </form>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Filtrar clientes" className="flex flex-wrap gap-2">
            {FILTROS.map((f) => <Link key={f.id || "todos"} href={href({ filtro: f.id })} aria-current={filtro === f.id ? "page" : undefined} className={chip(filtro === f.id)}>{f.label}</Link>)}
          </nav>
          <nav aria-label="Ordenar clientes" className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-fg-dim">Ordenar</span>
            <span className="inline-flex rounded-full border border-line-mid p-1">
              {ORDENES.map((o) => (
                <Link key={o.id || "recientes"} href={href({ orden: o.id })} aria-current={orden === o.id ? "page" : undefined}
                  className={`inline-flex items-center min-h-11 sm:min-h-8 px-3 rounded-full text-sm font-semibold ${orden === o.id ? "bg-brand text-on-brand" : "text-fg-mute hover:text-fg"}`}>{o.label}</Link>
              ))}
            </span>
          </nav>
        </div>
      </div>
      {filas.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center space-y-4">
          <p className="text-fg font-medium">{busca ? `No hay clientes que coincidan con «${busca}».` : filtro ? `Ningún cliente con «${FILTROS.find((f) => f.id === filtro)?.label}».` : "Todavía no hay clientes."}</p>
          <p className="text-fg-dim text-sm">Crea el cliente una vez: de su ficha salen proyectos, tickets, facturas y su cuenta en Pime.</p>
          {busca || filtro
            ? <Link href="/empresa/clientes" className={btn.secondary}>Ver todos los clientes</Link>
            : <Link href="/empresa/clientes/nuevo" className={btn.primary}>Crear el primer cliente</Link>}
        </div>
      ) : (
        <ul className="bg-panel border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {/* Columnas fijas e iguales en todas las filas: la línea, los proyectos y el saldo quedan alineados. */}
          <li aria-hidden className={`hidden xl:grid gap-x-6 ${COLUMNAS} px-6 py-3 text-xs font-semibold uppercase tracking-widest text-fg-faint`}>
            <span>Cliente</span><span>Línea y cuenta</span><span>Proyectos</span><span className="text-right">Saldo</span>
          </li>
          {filas.map((c) => {
            const cuenta = !c.portalUsers.length ? "Sin cuenta" : c.portalUsers.some((p) => p.status === "activo") ? "Cuenta activa" : "Invitado";
            const proyectos = c.proyectos;
            const tickets = c.tickets.length;
            return (
              <li key={c.id} className={c.internal ? "bg-fill/60" : undefined}>
                <Link href={`/empresa/clientes/${c.id}`} className={`grid gap-x-6 gap-y-2 px-4 sm:px-6 py-4 hover:bg-fill md:items-center ${COLUMNAS}`}>
                  <span className="min-w-0 md:col-start-1 md:row-start-1"><span className="block text-fg font-medium truncate">{c.company || c.name}</span><span className="block text-fg-dim text-xs truncate">{c.company ? c.name : c.email ?? ""}</span></span>
                  <span className="flex gap-2 text-xs md:col-start-1 xl:col-start-2 xl:row-start-1">
                    {c.internal ? (
                      <span className="w-20 shrink-0 rounded-full py-1 text-center font-semibold bg-fill-2 text-fg-mute">Interna</span>
                    ) : (
                      <>
                        <span className={`w-20 shrink-0 rounded-full py-1 text-center font-semibold ${c.brandLine === "premium" ? "bg-sand/15 text-sand-fg" : "bg-brand/10 text-brand-fg"}`}>{c.brandLine === "premium" ? "Premium" : "Normal"}</span>
                        <span className="shrink-0 rounded-full px-3 py-1 font-semibold bg-fill-2 text-fg-dim">{cuenta}</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-fg-dim truncate md:col-start-1 xl:col-start-3 xl:row-start-1">
                    {proyectos ? `${proyectos} ${proyectos === 1 ? "proyecto" : "proyectos"} en curso` : "Sin proyectos en curso"}
                    {tickets ? ` · ${tickets} ${tickets === 1 ? "ticket" : "tickets"}` : ""}
                  </span>
                  <span className={`font-mono text-sm md:text-right md:col-start-2 md:row-start-1 md:row-span-3 xl:col-start-4 xl:row-span-1 ${!c.internal && c.saldo.pendiente > 0 ? "text-fg" : "text-fg-faint"}`}>{c.internal ? "No aplica" : c.saldo.pendiente > 0 ? dinero(c.saldo.pendiente) : "Al día"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
