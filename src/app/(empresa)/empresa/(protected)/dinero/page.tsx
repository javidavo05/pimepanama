import Link from "@/components/empresa/link";
import { SIN_INTERNOS } from "@/lib/clientes/interno";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { dinero } from "@/lib/portal/datos";
import { formatoHoras } from "@/lib/portal/horas";
import { PAGO_METODO_LABEL, type PagoMetodo } from "@/lib/portal/estados";
import { armarTablero } from "@/lib/dinero/tablero";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { FacturarHorasForm, PagoPorConfirmar } from "@/components/empresa/clientes/formularios";
import { TableroDinero } from "./tablero";
import { CobrosSinFecha } from "./cobros-sin-fecha";

export const metadata = { title: "Dinero — Pime Suite" };
const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
const fecha = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-PA", { day: "numeric", month: "short", timeZone: "America/Panama" }) : "—");
const CLIENTE = { select: { name: true, company: true } } as const;

/**
 * Dinero en un solo lugar: primero lo que pide una acción (pagos que reportaron los clientes, horas listas para
 * facturar, cobros viejos sin fecha) y debajo el tablero contable de toda la historia: mes a mes, por año, por
 * cliente, todas las facturas y todos los pagos.
 */
export default async function Dinero() {
  const u = await getEmpresaUser();
  const [facturas, pagos, porConfirmar, horas, gastos] = await Promise.all([
    prisma.document.findMany({ where: { userId: u.id, type: "FACTURA", ...SIN_INTERNOS }, select: { id: true, number: true, title: true, status: true, total: true, amountPaid: true, issueDate: true, dueDate: true, clientId: true, client: CLIENTE } }),
    prisma.payment.findMany({ where: { userId: u.id, status: "confirmado", ...SIN_INTERNOS }, select: { id: true, documentId: true, clientId: true, amount: true, status: true, paidAt: true, method: true, reference: true, client: CLIENTE } }),
    prisma.payment.findMany({ where: { userId: u.id, status: "por_confirmar" }, orderBy: { createdAt: "asc" }, select: { id: true, amount: true, paidAt: true, method: true, reference: true, clientId: true, client: CLIENTE, document: { select: { number: true } } } }),
    prisma.timeEntry.groupBy({ by: ["clientId"], where: { userId: u.id, invoiceId: null, billable: true, amount: { gt: 0 } }, _sum: { amount: true, billedMinutes: true } }),
    prisma.expense.findMany({ where: { userId: u.id, status: { not: "CANCELLED" } }, select: { amount: true, paidAt: true, category: true, title: true } }).catch(() => []),
  ]);
  const datos = armarTablero(facturas, pagos, gastos);
  const sinFecha = datos.entradas.filter((e) => e.sinFecha && e.facturaId).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const clientesHoras = horas.length ? await prisma.client.findMany({ where: { id: { in: horas.map((h) => h.clientId) } }, select: { id: true, name: true, company: true } }) : [];
  const nombre = (id: string) => { const c = clientesHoras.find((x) => x.id === id); return c?.company || c?.name || "Cliente"; };
  const porPagar = gastos.filter((g) => !g.paidAt);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Dinero"
        description="Lo que entra, lo facturado y lo que se debe: mes a mes, por año y por cliente."
        actions={<Link href="/empresa/facturas/nueva" className={btn.accent}>+ Nueva factura</Link>}
      />

      {(porConfirmar.length > 0 || horas.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {porConfirmar.length > 0 && (
            <section className={`${card} border-info/40`}>
              <h2 className="text-fg text-base font-semibold">Pagos reportados por clientes <span className="ml-1 rounded-full bg-info/10 px-2 text-xs text-info tabular-nums">{porConfirmar.length}</span></h2>
              <p className="mt-1 text-fg-dim text-sm">Confírmalos cuando veas el dinero en la cuenta.</p>
              <ul className="mt-3 divide-y divide-line">{porConfirmar.map((p) => (
                <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 text-sm"><Link href={`/empresa/clientes/${p.clientId}`} className="text-fg font-medium hover:underline">{p.client?.company || p.client?.name}</Link><span className="block text-fg-dim text-xs">{dinero(p.amount)} · {fecha(p.paidAt)} · {PAGO_METODO_LABEL[p.method as PagoMetodo] ?? p.method}{p.reference ? ` · ref. ${p.reference}` : ""}{p.document?.number ? ` · ${p.document.number}` : ""}</span></span>
                  <PagoPorConfirmar pagoId={p.id} clientId={p.clientId} />
                </li>
              ))}</ul>
            </section>
          )}
          {horas.length > 0 && (
            <section className={card}>
              <h2 className="text-fg text-base font-semibold">Horas listas para facturar</h2>
              <ul className="mt-3 divide-y divide-line">{horas.map((h) => (
                <li key={h.clientId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm"><Link href={`/empresa/clientes/${h.clientId}`} className="text-fg font-medium hover:underline">{nombre(h.clientId)}</Link><span className="block text-fg-dim text-xs">{formatoHoras(h._sum.billedMinutes ?? 0)}</span></span>
                  <FacturarHorasForm clientId={h.clientId} monto={dinero(h._sum.amount ?? 0)} />
                </li>
              ))}</ul>
            </section>
          )}
        </div>
      )}

      {sinFecha.length > 0 && <CobrosSinFecha cobros={sinFecha} />}

      <TableroDinero datos={datos} />

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Documentos">
        {[["/empresa/cotizaciones", "Cotizaciones"], ["/empresa/cuentas-por-cobrar", "Cuentas por cobrar"], ["/empresa/por-pagar", porPagar.length ? `Por pagar · ${dinero(porPagar.reduce((a, g) => a + Number(g.amount ?? 0), 0))}` : "Por pagar"], ["/empresa/reportes?vista=ingresos", "Reporte de ingresos"]].map(([h, t]) => (
          <Link key={h} href={h} className="inline-flex items-center justify-center text-center min-h-11 px-3 rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg hover:border-line-loud">{t}</Link>
        ))}
      </nav>
    </div>
  );
}
