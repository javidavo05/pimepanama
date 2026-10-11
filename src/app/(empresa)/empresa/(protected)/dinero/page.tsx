import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { dinero } from "@/lib/portal/datos";
import { pagadoDeFactura } from "@/lib/portal/saldo";
import { formatoHoras } from "@/lib/portal/horas";
import { PAGO_METODO_LABEL, type PagoMetodo } from "@/lib/portal/estados";
import { PageHeader } from "@/components/empresa/page-header";
import { FacturarHorasForm, PagoPorConfirmar } from "@/components/empresa/clientes/formularios";

export const metadata = { title: "Dinero — Pime Suite" };
const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
const fecha = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-PA", { day: "numeric", month: "short", timeZone: "America/Panama" }) : "—");

/**
 * Dinero en un solo lugar: lo que hay que cobrar hoy, pagos que reportaron los clientes, horas listas
 * para facturar y accesos a facturas, cotizaciones, por cobrar y por pagar.
 */
export default async function Dinero() {
  const u = await getEmpresaUser();
  const hoy = new Date();
  const [facturas, pagos, porConfirmar, horas, gastos] = await Promise.all([
    prisma.document.findMany({ where: { userId: u.id, type: "FACTURA", status: { in: ["SENT", "ACCEPTED", "PARTIALLY_PAID"] } }, select: { id: true, number: true, title: true, total: true, amountPaid: true, dueDate: true, client: { select: { id: true, name: true, company: true } } }, orderBy: { dueDate: "asc" } }),
    prisma.payment.findMany({ where: { userId: u.id, status: "confirmado" }, select: { documentId: true, amount: true, status: true, paidAt: true } }),
    prisma.payment.findMany({ where: { userId: u.id, status: "por_confirmar" }, orderBy: { createdAt: "asc" }, select: { id: true, amount: true, paidAt: true, method: true, reference: true, receiptR2Key: true, clientId: true, client: { select: { name: true, company: true } }, document: { select: { number: true } } } }),
    prisma.timeEntry.groupBy({ by: ["clientId"], where: { userId: u.id, invoiceId: null, billable: true, amount: { gt: 0 } }, _sum: { amount: true, billedMinutes: true } }),
    prisma.expense.findMany({ where: { userId: u.id, paidAt: null, status: { not: "CANCELLED" } }, select: { amount: true, dueDate: true } }).catch(() => []),
  ]);
  const abiertas = facturas.map((f) => { const pagado = Math.max(pagadoDeFactura(f.id, pagos), Number(f.amountPaid ?? 0)); return { ...f, falta: Math.max(0, Number(f.total ?? 0) - pagado) }; }).filter((f) => f.falta > 0.005);
  const vencidas = abiertas.filter((f) => f.dueDate && f.dueDate < hoy);
  const porCobrar = abiertas.reduce((a, f) => a + f.falta, 0);
  const clientesHoras = await prisma.client.findMany({ where: { id: { in: horas.map((h) => h.clientId) } }, select: { id: true, name: true, company: true } });
  const nombre = (id: string) => { const c = clientesHoras.find((x) => x.id === id); return c?.company || c?.name || "Cliente"; };
  const porPagar = gastos.reduce((a, g) => a + Number(g.amount ?? 0), 0);
  const mesInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const cobradoMes = pagos.filter((p) => p.paidAt >= mesInicio).reduce((a, p) => a + Number(p.amount), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Dinero" description="Lo que entra y lo que sale, en un solo lugar." />
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Por cobrar", dinero(porCobrar), `${abiertas.length} factura(s)`], ["Vencido", dinero(vencidas.reduce((a, f) => a + f.falta, 0)), `${vencidas.length} factura(s)`], ["Cobrado este mes", dinero(cobradoMes), "pagos confirmados"], ["Por pagar", dinero(porPagar), `${gastos.length} gasto(s)`]].map(([k, v, d]) => (
          <div key={k} className="bg-panel border border-line rounded-2xl px-4 py-4"><dt className="text-fg-dim text-xs">{k}</dt><dd className="text-fg font-mono text-xl font-semibold">{v}</dd><dd className="text-fg-faint text-xs">{d}</dd></div>
        ))}
      </dl>
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Documentos">
        {[["/empresa/facturas", "Facturas"], ["/empresa/cotizaciones", "Cotizaciones"], ["/empresa/cuentas-por-cobrar", "Por cobrar"], ["/empresa/por-pagar", "Por pagar"]].map(([h, t]) => (
          <Link key={h} href={h} className="inline-flex items-center justify-center min-h-11 rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg hover:border-line-loud">{t}</Link>
        ))}
      </nav>
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <section className={card}>
          <h2 className="text-fg text-base font-semibold">Pagos reportados por clientes</h2>
          {porConfirmar.length ? (
            <ul className="mt-3 divide-y divide-line">{porConfirmar.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 text-sm"><Link href={`/empresa/clientes/${p.clientId}`} className="text-fg font-medium hover:underline">{p.client?.company || p.client?.name}</Link><span className="block text-fg-dim text-xs">{dinero(p.amount)} · {fecha(p.paidAt)} · {PAGO_METODO_LABEL[p.method as PagoMetodo] ?? p.method}{p.reference ? ` · ref. ${p.reference}` : ""}{p.document?.number ? ` · ${p.document.number}` : ""}</span></span>
                <PagoPorConfirmar pagoId={p.id} clientId={p.clientId} />
              </li>
            ))}</ul>
          ) : <p className="mt-2 text-sm text-fg-dim">Nada por confirmar. Cuando un cliente reporte una transferencia desde su cuenta, aparece aquí.</p>}
        </section>
        <section className={card}>
          <h2 className="text-fg text-base font-semibold">Horas listas para facturar</h2>
          {horas.length ? (
            <ul className="mt-3 divide-y divide-line">{horas.map((h) => (
              <li key={h.clientId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm"><Link href={`/empresa/clientes/${h.clientId}`} className="text-fg font-medium hover:underline">{nombre(h.clientId)}</Link><span className="block text-fg-dim text-xs">{formatoHoras(h._sum.billedMinutes ?? 0)}</span></span>
                <FacturarHorasForm clientId={h.clientId} monto={dinero(h._sum.amount ?? 0)} />
              </li>
            ))}</ul>
          ) : <p className="mt-2 text-sm text-fg-dim">No hay horas sin facturar.</p>}
        </section>
      </div>
      <section className={card}>
        <h2 className="text-fg text-base font-semibold">Facturas por cobrar</h2>
        {abiertas.length ? (
          <ul className="mt-3 divide-y divide-line">{abiertas.slice(0, 40).map((f) => (
            <li key={f.id}><Link href={`/empresa/facturas/${f.id}`} className="grid gap-1 py-3 hover:bg-fill -mx-2 px-2 rounded-lg sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
              <span className="min-w-0"><span className="block text-fg text-sm font-medium truncate">{f.number} · {f.client?.company || f.client?.name || "Sin cliente"}</span><span className="block text-fg-dim text-xs truncate">{f.title}</span></span>
              <span className={`text-xs ${f.dueDate && f.dueDate < hoy ? "text-danger font-semibold" : "text-fg-dim"}`}>{f.dueDate ? `${f.dueDate < hoy ? "Venció" : "Vence"} el ${fecha(f.dueDate)}` : "Sin vencimiento"}</span>
              <span className="font-mono text-sm text-fg sm:text-right">{dinero(f.falta)}</span>
            </Link></li>
          ))}</ul>
        ) : <p className="mt-2 text-sm text-fg-dim">Todo cobrado.</p>}
      </section>
    </div>
  );
}
