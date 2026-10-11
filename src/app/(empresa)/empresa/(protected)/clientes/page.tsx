import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { saldoCliente } from "@/lib/portal/saldo";
import { dinero } from "@/lib/portal/datos";
import { TICKET_ABIERTOS } from "@/lib/portal/estados";
import { PageHeader, btn } from "@/components/empresa/page-header";

export const metadata = { title: "Clientes — Pime Suite" };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const u = await getEmpresaUser();
  const { q } = await searchParams;
  const busca = q?.trim();
  const clientes = await prisma.client.findMany({
    where: { userId: u.id, archivedAt: null, ...(busca ? { OR: [{ name: { contains: busca, mode: "insensitive" } }, { company: { contains: busca, mode: "insensitive" } }, { email: { contains: busca, mode: "insensitive" } }, { ruc: { contains: busca } }] } : {}) },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, company: true, email: true, brandLine: true,
      documents: { where: { type: "FACTURA" }, select: { id: true, status: true, total: true, amountPaid: true } },
      payments: { select: { documentId: true, amount: true, status: true } },
      tickets: { where: { status: { in: TICKET_ABIERTOS } }, select: { id: true } },
      portalUsers: { where: { status: { not: "revocado" } }, select: { status: true } },
      _count: { select: { projects: { where: { status: "ACTIVE" } }, projectLinks: { where: { project: { status: "ACTIVE" } } } } },
    },
  });
  const filas = clientes.map((c) => ({ ...c, saldo: saldoCliente(c.documents, c.payments) }));
  const porCobrar = filas.reduce((a, c) => a + c.saldo.pendiente, 0);
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Clientes" description={<>{clientes.length} clientes · Por cobrar <span className="font-mono text-fg">{dinero(porCobrar)}</span></>} actions={<Link href="/empresa/clientes/nuevo" className={btn.primary}>+ Nuevo cliente</Link>} />
      <form className="flex gap-2" role="search">
        <input name="q" defaultValue={busca} placeholder="Buscar por nombre, empresa, correo o RUC" aria-label="Buscar clientes" className="w-full min-h-11 rounded-lg border border-line-mid bg-panel px-3 text-base sm:text-sm text-fg placeholder:text-fg-trace focus:outline-none focus:border-brand" />
        <button className={btn.secondary}>Buscar</button>
      </form>
      {filas.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center space-y-4">
          <p className="text-fg font-medium">{busca ? `No hay clientes que coincidan con «${busca}».` : "Todavía no hay clientes."}</p>
          <p className="text-fg-dim text-sm">Crea el cliente una vez: de su ficha salen proyectos, tickets, facturas y su cuenta en Pime.</p>
          <Link href="/empresa/clientes/nuevo" className={btn.primary}>Crear el primer cliente</Link>
        </div>
      ) : (
        <ul className="bg-panel border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {filas.map((c) => {
            const cuenta = !c.portalUsers.length ? "Sin cuenta" : c.portalUsers.some((p) => p.status === "activo") ? "Cuenta activa" : "Invitado";
            const proyectos = Math.max(c._count.projects, c._count.projectLinks);
            return (
              <li key={c.id}>
                <Link href={`/empresa/clientes/${c.id}`} className="grid gap-2 px-4 sm:px-6 py-4 hover:bg-fill sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                  <span className="min-w-0"><span className="block text-fg font-medium truncate">{c.company || c.name}</span><span className="block text-fg-dim text-xs truncate">{c.company ? c.name : c.email ?? ""}</span></span>
                  <span className="flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-full px-2.5 py-1 font-semibold ${c.brandLine === "premium" ? "bg-sand/15 text-sand-fg" : "bg-brand/10 text-brand-fg"}`}>{c.brandLine === "premium" ? "Premium" : "Normal"}</span>
                    <span className="rounded-full px-2.5 py-1 font-semibold bg-fill-2 text-fg-dim">{cuenta}</span>
                  </span>
                  <span className="text-xs text-fg-dim">{proyectos ? `${proyectos} proyecto(s) en curso` : "Sin proyectos en curso"}{c.tickets.length ? ` · ${c.tickets.length} ticket(s)` : ""}</span>
                  <span className={`font-mono text-sm sm:text-right ${c.saldo.pendiente > 0 ? "text-fg" : "text-fg-faint"}`}>{c.saldo.pendiente > 0 ? dinero(c.saldo.pendiente) : "Al día"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
