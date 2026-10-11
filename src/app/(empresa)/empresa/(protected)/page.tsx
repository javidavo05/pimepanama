import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { datosHoy, type ItemAgenda } from "@/lib/motor/hoy";
import { BotonCobrar } from "@/components/empresa/cobrar/asistente-cobrar";
import { LazyDashboardRevenueChart as DashboardRevenueChart } from "@/components/empresa/revenue-chart-lazy";
import { buildMonthlyRevenue, buildYearlyRevenue } from "@/lib/revenue-helpers";
import { PAID_INVOICE_REVENUE_SELECT, paidInvoiceWhere, effectiveInvoiceAmount } from "@/lib/invoice-revenue";

export const metadata = { title: "Hoy — Pime Suite" };
export const dynamic = "force-dynamic";

const usd = (n: number) => `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
const h2 = "text-fg text-base font-semibold tracking-tight";
const hora = (d: Date) => d.toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" });
const TIPO: Record<ItemAgenda["tipo"], string> = { tarea: "Tarea", cita: "Cita", reunion: "Reunión", cuota: "Cobro", factura: "Cobro", evento: "Evento" };

export default async function HoyPage() {
  const user = await getEmpresaUser();
  const [d, clientes, pagadas] = await Promise.all([
    datosHoy(user.id),
    prisma.client.findMany({ where: { userId: user.id, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true } }),
    prisma.document.findMany({ where: paidInvoiceWhere(user.id), select: PAID_INVOICE_REVENUE_SELECT, orderBy: { issueDate: "asc" } }),
  ]);
  const filas = pagadas.map((x) => ({ issueDate: x.issueDate, ...effectiveInvoiceAmount(x) }));
  const nombre = (user.fullName || "").split(" ")[0];
  const fecha = new Date().toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Panama" });
  const ahora = Date.now();

  const resumen = [
    d.agenda.length ? `${d.agenda.length} ${d.agenda.length === 1 ? "cosa en la agenda" : "cosas en la agenda"}` : null,
    d.totalVencidas ? `${d.totalVencidas} ${d.totalVencidas === 1 ? "cobro vencido" : "cobros vencidos"}` : null,
    d.sistemas.length ? `${d.sistemas.length} ${d.sistemas.length === 1 ? "sistema con problemas" : "sistemas con problemas"}` : null,
  ].filter(Boolean).join(" · ") || "Nada urgente: todo al día.";
  const hayAlertas = d.vencidas.length > 0 || d.sistemas.length > 0 || d.tickets.sinResponder.length > 0;
  const cambioMes = d.dinero.entroMesPasado > 0 ? Math.round(((d.dinero.entroMes - d.dinero.entroMesPasado) / d.dinero.entroMesPasado) * 100) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-fg-dim text-sm first-letter:uppercase">{fecha}</p>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">{nombre ? `Hola, ${nombre}` : "Hoy"}</h1>
          <p className="text-fg-mute text-sm mt-1">{resumen}</p>
        </div>
        <BotonCobrar clientes={clientes.map((c) => ({ id: c.id, nombre: c.company || c.name }))} className="inline-flex items-center justify-center min-h-12 sm:min-h-11 px-6 rounded-xl bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hi" />
      </header>

      {/* Dinero con colores: rojo vencido, azul por cobrar, verde entró. */}
      <section aria-label="Dinero" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/empresa/cuentas-por-cobrar" className={`rounded-2xl border p-4 sm:p-6 ${d.dinero.vencido > 0 ? "border-danger/40 bg-danger/5" : "border-line bg-panel"}`}>
          <p className={`text-sm font-semibold ${d.dinero.vencido > 0 ? "text-danger" : "text-fg-dim"}`}>{d.dinero.vencido > 0 ? "● Vencido" : "Vencido"}</p>
          <p className={`text-2xl font-bold tabular-nums tracking-tight ${d.dinero.vencido > 0 ? "text-danger" : "text-fg-dim"}`}>{usd(d.dinero.vencido)}</p>
          <p className="text-fg-dim text-xs mt-1">{d.totalVencidas ? d.totalVencidas === 1 ? "1 factura pasada de fecha" : `${d.totalVencidas} facturas pasadas de fecha` : "Nadie te debe pasado de fecha"}</p>
        </Link>
        <Link href="/empresa/cuentas-por-cobrar" className="rounded-2xl border border-brand/30 bg-brand/5 p-4 sm:p-6">
          <p className="text-brand-fg text-sm font-semibold">● Por cobrar</p>
          <p className="text-brand-fg text-2xl font-bold tabular-nums tracking-tight">{usd(d.dinero.porCobrar)}</p>
          <p className="text-fg-dim text-xs mt-1">{d.dinero.porVencer > 0 ? <span className="text-warn font-semibold">{usd(d.dinero.porVencer)} vence en 3 días</span> : "Todavía no vence"}</p>
        </Link>
        <Link href="/empresa/dinero" className="rounded-2xl border border-ok/30 bg-ok/5 p-4 sm:p-6">
          <p className="text-ok text-sm font-semibold">● Entró este mes</p>
          <p className="text-ok text-2xl font-bold tabular-nums tracking-tight">{usd(d.dinero.entroMes)}</p>
          <p className="text-fg-dim text-xs mt-1">{cambioMes === null ? `Mes pasado: ${usd(d.dinero.entroMesPasado)}` : `${cambioMes >= 0 ? "+" : ""}${cambioMes} % contra el mes pasado`}</p>
        </Link>
      </section>

      {hayAlertas && (
        <section className={`${card} border-danger/30`} aria-label="Alertas">
          <h2 className={`${h2} text-danger`}>Atiende primero</h2>
          <ul className="mt-3 divide-y divide-line">
            {d.sistemas.map((s) => (
              <li key={s.id}><Link href={`/empresa/sistemas/${s.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 min-h-12">
                <span className="min-w-0"><span className="block text-fg text-sm font-semibold truncate">{s.nombre} {s.estado === "caido" ? "no responde" : "funciona con fallas"}</span><span className="block text-fg-dim text-xs truncate">{s.cliente}</span></span>
                <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">{s.estado === "caido" ? "Caído" : "Con fallas"}</span>
              </Link></li>
            ))}
            {d.vencidas.map((v) => (
              <li key={v.id}><Link href={v.href} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 min-h-12">
                <span className="min-w-0"><span className="block text-fg text-sm font-semibold truncate">{v.cliente} te debe {usd(v.falta)}</span><span className="block text-fg-dim text-xs">{v.numero ?? "Factura"} · vencida hace {v.dias} {v.dias === 1 ? "día" : "días"}</span></span>
                <span className="text-danger text-sm font-semibold whitespace-nowrap">Cobrar →</span>
              </Link></li>
            ))}
            {d.tickets.sinResponder.map((t) => (
              <li key={t.id}><Link href={`/empresa/tickets/${t.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 min-h-12">
                <span className="min-w-0"><span className="block text-fg text-sm font-semibold truncate">{t.cliente} espera respuesta</span><span className="block text-fg-dim text-xs truncate">{t.numero} · {t.titulo}</span></span>
                <span className={`text-sm font-semibold whitespace-nowrap ${t.urgente ? "text-danger" : "text-warn"}`}>Responder →</span>
              </Link></li>
            ))}
          </ul>
          {d.totalVencidas > d.vencidas.length && <Link href="/empresa/cuentas-por-cobrar" className="mt-2 inline-flex items-center min-h-11 text-sm font-semibold text-danger hover:underline">Ver las {d.totalVencidas} vencidas</Link>}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-5 items-start">
        <section className={`${card} lg:col-span-3`} aria-label="Agenda de hoy">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={h2}>Tu día</h2>
            <Link href="/empresa/tareas" className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">Tareas</Link>
          </div>
          {d.tareasAtrasadas > 0 && <p className="mt-2 text-sm text-warn font-semibold">{d.tareasAtrasadas} {d.tareasAtrasadas === 1 ? "tarea atrasada" : "tareas atrasadas"} de días anteriores</p>}
          {d.agenda.length === 0 ? (
            <div className="mt-4 rounded-xl bg-fill p-4 text-sm text-fg-dim">No tienes nada agendado para hoy. Las tareas que venzan hoy, tus citas, reuniones y cobros del día aparecen aquí. Pronto también tu Google Calendar.</div>
          ) : (
            <ol className="mt-4 space-y-1">
              {d.agenda.map((a) => {
                const paso = a.hora ? a.hora.getTime() < ahora - 30 * 60_000 : false;
                const Cuerpo = (
                  <span className={`grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-xl px-3 py-3 min-h-12 ${paso ? "opacity-50" : "hover:bg-fill"}`}>
                    <span className="text-fg-dim text-sm tabular-nums">{a.hora ? hora(a.hora) : "Hoy"}</span>
                    <span className="min-w-0">
                      <span className="block text-fg text-sm font-semibold [overflow-wrap:anywhere]">{a.titulo}</span>
                      <span className="block text-fg-dim text-xs">{TIPO[a.tipo]}{a.detalle ? ` · ${a.detalle}` : ""}</span>
                    </span>
                  </span>
                );
                return <li key={a.id}>{a.href ? <Link href={a.href} className="block">{Cuerpo}</Link> : Cuerpo}</li>;
              })}
            </ol>
          )}
        </section>

        <div className="space-y-6 lg:col-span-2 min-w-0">
          <section className={card} aria-label="Esperan tu decisión">
            <h2 className={h2}>Esperan tu decisión</h2>
            {d.decisiones.length === 0 ? (
              <p className="mt-2 text-sm text-fg-dim">Nada pendiente: sin borradores ni pagos por confirmar.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {d.decisiones.slice(0, 6).map((x) => (
                  <li key={x.id}><Link href={x.href} className="block py-3 min-h-12">
                    <span className="block text-fg text-sm font-semibold truncate">{x.titulo}</span>
                    <span className="block text-fg-dim text-xs truncate">{x.detalle}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </section>

          <section className={card} aria-label="Proyectos en curso">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={h2}>Proyectos en curso</h2>
              <Link href="/empresa/proyectos" className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">Todos</Link>
            </div>
            {d.proyectos.length === 0 ? (
              <p className="mt-2 text-sm text-fg-dim">No hay proyectos en curso.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {d.proyectos.map((p) => (
                  <li key={p.id}><Link href={`/empresa/proyectos/${p.id}`} className="block space-y-2">
                    <span className="flex items-baseline justify-between gap-3"><span className="min-w-0 truncate text-fg text-sm font-semibold">{p.nombre}</span><span className="text-fg text-sm tabular-nums">{Math.round(p.avance)} %</span></span>
                    <span className="block h-1.5 rounded-full bg-fill-3 overflow-hidden"><span className="block h-full bg-brand origin-left" style={{ transform: `scaleX(${p.avance / 100})` }} /></span>
                    <span className="block text-fg-dim text-xs truncate">{p.cliente}{p.diasSinActividad !== null && p.diasSinActividad > 14 ? <span className="text-warn font-semibold"> · {p.diasSinActividad} días sin actividad en GitHub</span> : ""}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className={card} aria-label="Ingresos">
        <DashboardRevenueChart monthlyData={buildMonthlyRevenue(filas)} yearlyData={buildYearlyRevenue(filas)} />
      </section>
    </div>
  );
}
