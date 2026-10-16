import { notFound } from "next/navigation";
import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { fichaCliente } from "@/lib/portal/ficha";
import { dinero } from "@/lib/portal/datos";
import { formatoHoras } from "@/lib/portal/horas";
import { PAGO_METODO_LABEL, TICKET_ESTADO_LABEL, type PagoMetodo, type TicketEstado } from "@/lib/portal/estados";
import { ListaFacturas } from "@/components/empresa/facturas/lista-facturas";
import { FechasPago, type FacturaFechas } from "@/components/empresa/clientes/fechas-pago";
import { btn } from "@/components/empresa/page-header";
import { FacturarHorasForm, HorasForm, InvitarForm, PagoForm, PagoPorConfirmar, PersonaAcciones } from "@/components/empresa/clientes/formularios";
import { ZonaLinea } from "@/components/empresa/clientes/zona-linea";
import { EstadoSistemaPill } from "@/components/empresa/sistemas/estado";
import { BotonCobrar } from "@/components/empresa/cobrar/asistente-cobrar";
import { prisma } from "@/lib/prisma";
import { plataformasDeCliente } from "@/lib/platforms/cliente";
import { PlataformasCliente } from "@/components/empresa/clientes/plataformas-cliente";
import { FichaTabs } from "@/components/empresa/clientes/ficha-tabs";
import { totalesGastos } from "@/lib/gastos/totales";

export const metadata = { title: "Cliente — Pime Suite" };

const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
const h2 = "text-fg text-base font-semibold tracking-tight";
const fecha = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Panama" }) : "—");
const mesAnio = (d: Date) => new Date(d).toLocaleDateString("es-PA", { month: "long", year: "numeric", timeZone: "America/Panama" });
const tiempo = (d: Date) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : fecha(d);
};

/** ?tab=resumen|tickets|proyectos|facturas|plataformas|cuenta — Resumen por defecto. */
export default async function FichaCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab: tabInicial = "resumen" }] = await Promise.all([params, searchParams]);
  const u = await getEmpresaUser();
  const [f, todos, plataformas] = await Promise.all([
    fichaCliente(u.id, id),
    prisma.client.findMany({ where: { userId: u.id, archivedAt: null, internal: false }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true } }),
    // Si falla, la pestaña Plataformas lo dice; el resto de la ficha sigue.
    plataformasDeCliente(u.id, id).catch(() => null),
  ]);
  if (!f) notFound();
  // Empresa interna: su dinero son los gastos de sus productos, no cobros.
  const interna = f.cliente.internal;
  const ing = f.ingresos;
  const maxAnio = Math.max(0, ...ing.porAnio.map((y) => y.monto));
  const sinProyecto = Math.max(0, ing.total - [...ing.porProyecto.values()].reduce((a, v) => a + v, 0));
  const gastos = interna
    ? await prisma.expense.findMany({
        where: { userId: u.id, project: { OR: [{ clientId: id }, { clients: { some: { clientId: id } } }] } },
        select: { projectId: true, title: true, vendor: true, amount: true, status: true, isRecurring: true, paidAt: true, dueDate: true, createdAt: true },
      }).catch(() => null)
    : [];
  const aGasto = (g: NonNullable<typeof gastos>[number]) => ({ ...g, amount: Number(g.amount) });
  const totalInterna = totalesGastos((gastos ?? []).map(aGasto));
  const porProducto = f.proyectos.map((p) => ({ id: p.id, nombre: p.name, t: totalesGastos((gastos ?? []).filter((g) => g.projectId === p.id).map(aGasto)) }));
  const clientesCobro = todos.map((x) => ({ id: x.id, nombre: x.company || x.name }));
  const c = f.cliente;
  const premium = c.brandLine === "premium";
  const principal = f.personas.find((p) => p.role === "principal");
  const cuenta = !f.personas.length ? ["Sin cuenta", "bg-fill-2 text-fg-dim"] : f.personas.some((p) => p.status === "activo") ? ["Cuenta activa", "bg-ok/10 text-ok"] : ["Invitación enviada", "bg-warn/10 text-warn"];
  const porFacturar = f.horasPorFacturar.reduce((a, h) => a + Number(h.amount), 0);
  const minutosPorFacturar = f.horasPorFacturar.reduce((a, h) => a + h.billedMinutes, 0);
  // Abonos de cada factura, del más viejo al más nuevo: cada uno lleva su recibo.
  const pagosDe = (facturaId: string) => f.pagos.filter((p) => p.documentId === facturaId && p.status === "confirmado").map((p) => ({ id: p.id, monto: Number(p.amount), fecha: p.paidAt })).sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const facturasAbiertas = f.facturas.filter((x) => x.falta > 0.005 && x.status !== "DRAFT" && x.status !== "CANCELLED");
  // Fechas de pago que el dueño puede mover: vencimiento de cada factura con saldo, sus cuotas y lo que falta programar.
  const fechasPago: FacturaFechas[] = facturasAbiertas.map((x) => {
    const vivas = x.paymentSchedules.filter((c) => c.status === "PENDING" || c.status === "OVERDUE");
    const programado = vivas.reduce((a, c) => a + Number(c.amount), 0);
    return {
      id: x.id, number: x.number, title: x.title, total: Number(x.total ?? 0), falta: x.falta,
      dueDate: x.dueDate ? x.dueDate.toISOString() : null,
      // Solo hay algo que programar si ya hay cuotas o pagos parciales: una factura sin pagos se mueve con su vencimiento.
      porProgramar: vivas.length || x.pagado > 0.005 ? Math.max(0, Math.round((x.falta - programado) * 100) / 100) : 0,
      cuotas: x.paymentSchedules.map((c) => ({ id: c.id, description: c.description, amount: Number(c.amount), dueDate: c.dueDate.toISOString(), status: c.status })),
    };
  });

  return (
    <ZonaLinea linea={c.brandLine}>
    <div className="max-w-6xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-fg-dim min-w-0" aria-label="Ruta">
        <Link href="/empresa/clientes" className="inline-flex items-center min-h-11 sm:min-h-8 shrink-0 hover:text-fg-mute">Clientes</Link>
        <span aria-hidden>/</span><span className="text-fg-mute truncate">{c.company || c.name}</span>
      </nav>

      <header className={card}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {interna ? (
                <span className="rounded-full px-3 py-1 text-xs font-semibold bg-fill-2 text-fg-mute">Interna · nuestros productos</span>
              ) : (
                <>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${premium ? "bg-sand/15 text-sand-fg" : "bg-brand/10 text-brand-fg"}`}>{premium ? "Premium" : "Normal"} · {dinero(f.tarifa)}/h</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cuenta[1]}`}>{cuenta[0]}</span>
                </>
              )}
            </div>
            <h1 className="text-fg text-2xl font-semibold tracking-tight break-words">{c.company || c.name}</h1>
            <p className="text-fg-dim text-sm break-words">{[c.company ? c.name : null, c.email, c.phone, c.ruc ? `RUC ${c.ruc}` : null].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            <Link href={`/empresa/tickets/nuevo?clientId=${c.id}`} className={btn.primary}>+ Ticket</Link>
            {interna ? (
              <Link href="/empresa/por-pagar?nuevo=1" className={btn.secondary}>+ Gasto</Link>
            ) : (
              <BotonCobrar clientes={clientesCobro} clienteInicial={c.id} etiqueta="Cobrar" className={btn.secondary} />
            )}
            <Link href={`/empresa/proyectos/nuevo?clientId=${c.id}`} className={btn.secondary}>+ Proyecto</Link>
            <Link href={`/empresa/clientes/${c.id}/editar`} className={btn.secondary}>Editar</Link>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(interna ? [
            ["Gastos este mes", dinero(totalInterna.mes), totalInterna.mes > 0 ? "text-fg" : "text-fg-dim"],
            ["Gastos este año", dinero(totalInterna.anio), totalInterna.anio > 0 ? "text-fg" : "text-fg-dim"],
            ["Recurrente al mes", dinero(totalInterna.recurrenteMensual), totalInterna.recurrenteMensual > 0 ? "text-fg" : "text-fg-dim"],
            ["Tickets abiertos", String(f.abiertos.length), f.abiertos.length ? "text-brand-fg" : "text-fg-dim"],
          ] : [
            ["Por cobrar", dinero(f.saldo.pendiente), f.saldo.pendiente > 0 ? "text-fg" : "text-fg-dim"],
            ["Pagado", dinero(f.saldo.pagado), "text-ok"],
            ["Horas por facturar", porFacturar ? `${dinero(porFacturar)} · ${formatoHoras(minutosPorFacturar)}` : "—", porFacturar ? "text-sand-fg" : "text-fg-dim"],
            ["Tickets abiertos", String(f.abiertos.length), f.abiertos.length ? "text-brand-fg" : "text-fg-dim"],
          ]).map(([k, v, cls]) => (
            <div key={k} className="rounded-xl bg-fill px-4 py-3 min-w-0"><dt className="text-fg-dim text-xs">{k}</dt><dd className={`font-semibold font-mono text-base truncate ${cls}`}>{v}</dd></div>
          ))}
        </dl>
      </header>


      <FichaTabs
        initial={tabInicial}
        tabs={[
          { key: "resumen", label: "Resumen", alert: f.porConfirmar.length > 0 },
          { key: "tickets", label: "Tickets", count: f.abiertos.length },
          { key: "proyectos", label: "Proyectos", count: f.proyectos.length },
          { key: "facturas", label: "Facturas y pagos", count: facturasAbiertas.length },
          { key: "plataformas", label: "Plataformas", count: (plataformas?.length ?? 0) + f.sistemas.length },
          { key: "cuenta", label: "Cuenta", count: f.personas.length },
        ]}
        panels={{
        resumen: (
          <div className="grid gap-6 xl:grid-cols-3 items-start">
            <div className="space-y-6 xl:col-span-2 min-w-0">
              {!interna && (
                <section className={card} aria-labelledby="trajo-titulo">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="trajo-titulo" className={h2}>Lo que nos ha traído</h2>
                    <Link href={`/empresa/clientes/${c.id}?tab=facturas`} className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">Ver pagos</Link>
                  </div>
                  <p className="mt-3 font-mono text-3xl font-semibold tracking-tight tabular-nums text-ok">{dinero(ing.total)}</p>
                  <p className="text-sm text-fg-dim">
                    {ing.desde ? `Desde ${mesAnio(ing.desde)} · ${ing.entradas} ${ing.entradas === 1 ? "pago" : "pagos"}${ing.ultima ? ` · el último el ${fecha(ing.ultima)}` : ""}` : "Todavía no ha pagado nada. Cada pago que registres suma aquí."}
                  </p>
                  {ing.porAnio.length > 0 && (
                    <ul className="mt-4 space-y-2" aria-label="Por año">
                      {ing.porAnio.map((y) => (
                        <li key={y.anio} className="grid grid-cols-[3rem_minmax(0,1fr)_8rem] items-center gap-3 text-sm">
                          <span className="text-fg-dim tabular-nums">{y.anio}</span>
                          <span className="h-2 rounded-full bg-fill-3 overflow-hidden" aria-hidden>
                            <span className="block h-full rounded-full bg-ok origin-left" style={{ transform: `scaleX(${maxAnio ? y.monto / maxAnio : 0})` }} />
                          </span>
                          <span className="text-right font-mono tabular-nums text-fg">{dinero(y.monto)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-6 border-t border-line pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-fg-dim text-xs font-semibold uppercase tracking-wider">Proyectos · {f.proyectos.length}</h3>
                      <Link href={`/empresa/proyectos/nuevo?clientId=${c.id}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">+ Proyecto</Link>
                    </div>
                    {f.proyectos.length ? (
                      <ul className="mt-2 divide-y divide-line">
                        {f.proyectos.map((p) => (
                          <li key={p.id}>
                            <Link href={`/empresa/proyectos/${p.id}`} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 py-3 min-h-12 hover:bg-fill -mx-2 px-2 rounded-lg">
                              <span className="min-w-0">
                                <span className="block text-fg text-sm font-medium truncate">{p.name}</span>
                                <span className="block text-fg-dim text-xs truncate">{p.status === "ACTIVE" ? "En curso" : p.status === "COMPLETED" ? "Terminado" : p.status === "PAUSED" ? "En pausa" : "Cancelado"} · {Math.round(p.avance)} %{p.actual ? ` · ${p.actual.name}` : ""}</span>
                              </span>
                              <span className="text-right">
                                <span className={`block font-mono text-sm tabular-nums ${ing.porProyecto.get(p.id) ? "text-fg" : "text-fg-faint"}`}>{dinero(ing.porProyecto.get(p.id) ?? 0)}</span>
                                <span className="block text-fg-faint text-xs">cobrado</span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-sm text-fg-dim">Sin proyectos. Crea uno con sus fases y precios: de ahí salen la propuesta, las facturas y el avance que ve el cliente.</p>}
                    {sinProyecto > 0.005 && <p className="mt-2 text-xs text-fg-dim">{dinero(sinProyecto)} entraron por facturas sueltas, sin proyecto.</p>}
                  </div>
                </section>
              )}
                        {f.porConfirmar.length > 0 && (
                          <section className={`${card} border-warn/40`}>
                            <h2 className={h2}>Pagos reportados por el cliente</h2>
                            <ul className="mt-4 divide-y divide-line">
                              {f.porConfirmar.map((p) => (
                                <li key={p.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0 text-sm"><p className="text-fg font-semibold font-mono">{dinero(p.amount)}</p><p className="text-fg-dim">{fecha(p.paidAt)} · {PAGO_METODO_LABEL[p.method as PagoMetodo] ?? p.method}{p.reference ? ` · ref. ${p.reference}` : ""}{p.receiptR2Key ? " · con comprobante" : ""}</p></div>
                                  <PagoPorConfirmar pagoId={p.id} clientId={c.id} />
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

              {interna && (
                <section className={card}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className={h2}>Gastos por producto</h2>
                    <Link href="/empresa/por-pagar?nuevo=1" className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">+ Gasto</Link>
                  </div>
                  {gastos === null ? (
                    <p className="mt-2 text-sm text-danger" role="alert">No se pudieron cargar los gastos. Recarga la página.</p>
                  ) : !porProducto.length ? (
                    <p className="mt-2 text-sm text-fg-dim">Sin productos todavía. Crea un proyecto por producto y sus gastos se suman aquí.</p>
                  ) : (
                    <>
                      <div className="mt-3 hidden sm:grid grid-cols-[minmax(0,1fr)_repeat(3,7rem)] gap-3 text-xs text-fg-dim">
                        <span>Producto</span><span className="text-right">Este mes</span><span className="text-right">Este año</span><span className="text-right">Recurrente/mes</span>
                      </div>
                      <ul className="mt-1 divide-y divide-line">
                        {porProducto.map((p) => (
                          <li key={p.id}>
                            <Link href={`/empresa/proyectos/${p.id}?tab=dinero`} className="grid grid-cols-3 gap-x-3 gap-y-1 py-3 min-h-12 hover:bg-fill -mx-2 px-2 rounded-lg sm:grid-cols-[minmax(0,1fr)_repeat(3,7rem)] sm:items-center">
                              <span className="col-span-3 sm:col-span-1 text-fg text-sm font-medium truncate">{p.nombre}</span>
                              {[["Mes", p.t.mes], ["Año", p.t.anio], ["Recurrente", p.t.recurrenteMensual]].map(([k, v]) => (
                                <span key={k as string} className="font-mono text-sm sm:text-right tabular-nums">
                                  <span className="sm:hidden text-fg-dim text-xs font-sans">{k} </span>
                                  <span className={(v as number) > 0 ? "text-fg" : "text-fg-faint"}>{dinero(v as number)}</span>
                                </span>
                              ))}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {totalInterna.cantidad === 0 && (
                        <p className="mt-3 text-sm text-fg-dim">Todavía no hay gastos anotados. Registra lo que cuesta cada producto —hosting, base de datos, dominios— y aquí ves cuánto gasta cada uno.</p>
                      )}
                    </>
                  )}
                </section>
              )}

              <section className={card}>
                <h2 className={h2}>Lo urgente</h2>
                {f.abiertos.length === 0 && facturasAbiertas.length === 0 ? (
                  <p className="mt-3 text-sm text-fg-dim">Nada pendiente: sin tickets abiertos ni facturas por cobrar.</p>
                ) : (
                  <div className="mt-3 grid gap-6 lg:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-fg-dim text-xs font-semibold uppercase tracking-wider">Tickets abiertos · {f.abiertos.length}</p>
                      {f.abiertos.length ? (
                        <ul className="mt-2 divide-y divide-line">
                          {f.abiertos.slice(0, 5).map((t) => (
                            <li key={t.id}><Link href={`/empresa/tickets/${t.id}`} className="flex items-center gap-3 py-3 min-h-12 hover:bg-fill -mx-2 px-2 rounded-lg">
                              <span className="min-w-0 flex-1"><span className="block text-fg text-sm font-medium truncate">{t.title}</span><span className="block text-fg-dim text-xs">{t.number} · {tiempo(t.updatedAt)}{t.lastClientActivityAt && (!t.lastPimeActivityAt || t.lastClientActivityAt > t.lastPimeActivityAt) ? " · el cliente escribió" : ""}</span></span>
                            </Link></li>
                          ))}
                        </ul>
                      ) : <p className="mt-2 text-sm text-fg-dim">Ninguno.</p>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-fg-dim text-xs font-semibold uppercase tracking-wider">Facturas por cobrar · {facturasAbiertas.length}</p>
                      {facturasAbiertas.length ? (
                        <ul className="mt-2 divide-y divide-line">
                          {facturasAbiertas.slice(0, 5).map((x) => (
                            <li key={x.id}><Link href={`/empresa/facturas/${x.id}`} className="flex items-center gap-3 py-3 min-h-12 hover:bg-fill -mx-2 px-2 rounded-lg">
                              <span className="min-w-0 flex-1"><span className="block text-fg text-sm font-medium truncate">{x.number ?? "Factura"} · {x.title}</span><span className="block text-fg-dim text-xs">{x.dueDate ? `vence ${fecha(x.dueDate)}` : fecha(x.issueDate)}</span></span>
                              <span className="font-mono text-sm text-fg shrink-0">{dinero(x.falta)}</span>
                            </Link></li>
                          ))}
                        </ul>
                      ) : <p className="mt-2 text-sm text-fg-dim">Ninguna.</p>}
                    </div>
                  </div>
                )}
              </section>

                        <section className={card}>
                          <h2 className={h2}>Línea de tiempo</h2>
                          {f.eventos.length ? (
                            <ol className="mt-4 space-y-4">
                              {f.eventos.map((e) => (
                                <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                                  <span className={`mt-1.5 h-2 w-2 rounded-full ${e.actorType === "cliente" ? "bg-sand" : e.actorType === "github" ? "bg-ok" : "bg-brand"}`} aria-hidden />
                                  <div className="min-w-0"><p className="text-fg text-sm break-words">{e.title}{e.visibility === "interno" && <span className="ml-2 text-xs text-fg-faint">(interno)</span>}</p>{e.detail && <p className="text-fg-dim text-xs break-words">{e.detail}</p>}<p className="text-fg-faint text-xs">{tiempo(e.createdAt)}</p></div>
                                </li>
                              ))}
                            </ol>
                          ) : <p className="mt-3 text-sm text-fg-dim">Cada ticket, aprobación, factura y pago de este cliente queda aquí en orden.</p>}
                        </section>
            </div>
            <aside className="space-y-6 min-w-0">
              <section className={card}>
                <div className="flex items-center justify-between gap-3"><h2 className={h2}>Notas internas</h2><Link href={`/empresa/clientes/${c.id}/editar`} className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">Editar</Link></div>
                {c.notes ? <p className="mt-2 text-sm text-fg-mute whitespace-pre-line">{c.notes}</p> : <p className="mt-2 text-sm text-fg-dim">Sin notas. Lo que conviene recordar de este cliente va aquí; el cliente no lo ve.</p>}
              </section>
            </aside>
          </div>
        ),
        tickets: (
          <div className="space-y-6 max-w-4xl">
            <section className={card}>
              <div className="flex items-center justify-between gap-3"><h2 className={h2}>Tickets</h2><Link href={`/empresa/tickets?cliente=${c.id}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">Ver todos</Link></div>
              {f.tickets.length ? (
                <ul className="mt-3 divide-y divide-line">
                  {f.tickets.slice(0, 8).map((t) => (
                    <li key={t.id}><Link href={`/empresa/tickets/${t.id}`} className="flex items-center gap-3 py-3 min-h-12 hover:bg-fill -mx-2 px-2 rounded-lg">
                      <span className="min-w-0 flex-1"><span className="block text-fg text-sm font-medium truncate">{t.title}</span><span className="block text-fg-dim text-xs">{t.number} · {tiempo(t.updatedAt)}{t.lastClientActivityAt && (!t.lastPimeActivityAt || t.lastClientActivityAt > t.lastPimeActivityAt) ? " · el cliente escribió" : ""}</span></span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${t.status === "abierto" ? "bg-warn/10 text-warn" : t.status === "resuelto" || t.status === "cerrado" ? "bg-fill-2 text-fg-dim" : "bg-brand/10 text-brand-fg"}`}>{TICKET_ESTADO_LABEL[t.status as TicketEstado] ?? t.status}</span>
                    </Link></li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-fg-dim">Sin tickets. Cuando el cliente abra uno desde su cuenta, aparece aquí y te llega un aviso.</p>}
            </section>
          </div>
        ),
        proyectos: (
          <div className="space-y-6 max-w-4xl">
                      <section className={card}>
                        <div className="flex items-center justify-between gap-3"><h2 className={h2}>Proyectos</h2><Link href={`/empresa/proyectos/nuevo?clientId=${c.id}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">+ Proyecto</Link></div>
                        {f.proyectos.length ? (
                          <ul className="mt-3 space-y-3">
                            {f.proyectos.map((p) => (
                              <li key={p.id}><Link href={`/empresa/proyectos/${p.id}`} className="block rounded-xl border border-line px-4 py-3 hover:border-line-mid">
                                <div className="flex items-center justify-between gap-3"><span className="text-fg text-sm font-semibold truncate">{p.name}</span><span className="text-fg font-mono text-sm">{Math.round(p.avance)} %</span></div>
                                <div className="mt-2 h-1.5 rounded-full bg-fill-3 overflow-hidden"><div className="h-full bg-brand origin-left" style={{ transform: `scaleX(${p.avance / 100})` }} /></div>
                                <p className="mt-2 text-xs text-fg-dim">{p.status === "ACTIVE" ? "En curso" : p.status === "COMPLETED" ? "Terminado" : p.status === "PAUSED" ? "En pausa" : "Cancelado"}{p.actual ? ` · ahora: ${p.actual.name}` : p.phases.length ? "" : " · sin fases cargadas"}{p._count.changeOrders ? ` · ${p._count.changeOrders} orden(es) esperando al cliente` : ""}</p>
                              </Link></li>
                            ))}
                          </ul>
                        ) : <p className="mt-3 text-sm text-fg-dim">Sin proyectos. Crea uno con sus fases y precios: de ahí salen la propuesta, las facturas y el avance que ve el cliente.</p>}
                      </section>

            <section className={card}>
              <h2 className={h2}>Contratos</h2>
              {f.contratos.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">{f.contratos.map((k) => <li key={k.id}><Link href={`/empresa/contratos/${k.id}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg hover:underline">{k.title}</Link> <span className="text-fg-faint text-xs">· {k.signingStatus === "COMPLETED" ? "firmado" : k.signingStatus === "DRAFT" ? "borrador" : "por firmar"}</span></li>)}</ul>
              ) : <p className="mt-2 text-sm text-fg-dim">Sin contratos. Se generan desde cada proyecto.</p>}
            </section>
          </div>
        ),
        facturas: (
          <div className="grid gap-6 xl:grid-cols-3 items-start">
            <div className="space-y-6 xl:col-span-2 min-w-0">
              <section className={card}>
                <div className="flex items-center justify-between gap-3"><h2 className={h2}>Facturas{f.facturas.length ? ` · ${f.facturas.length}` : ""}</h2><BotonCobrar clientes={clientesCobro} clienteInicial={c.id} etiqueta="Cobrar" className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline" /></div>
                <ListaFacturas facturas={f.facturas.map((x) => ({ id: x.id, number: x.number, title: x.title, status: x.status, total: Number(x.total ?? 0), falta: x.falta, issueDate: x.issueDate, pagos: pagosDe(x.id) }))} vacio="Sin facturas todavía. Cada pago que registres sale con su factura." />
                {f.cotizaciones.length > 0 && <p className="mt-4 text-xs text-fg-dim">{f.cotizaciones.length} cotización(es): {f.cotizaciones.slice(0, 3).map((q) => <Link key={q.id} href={`/empresa/cotizaciones/${q.id}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg hover:underline mr-2">{q.number}</Link>)}</p>}
              </section>
              <section className={card} id="fechas-pago">
                <h2 className={h2}>Fechas de pago</h2>
                <p className="mt-1 text-sm text-fg-dim">Mueve el vencimiento de una factura o de una cuota, o programa el cobro de lo que falta. El cliente ve estas fechas en su cuenta y sus recordatorios salen de ellas.</p>
                <FechasPago facturas={fechasPago} />
              </section>
            </div>
            <aside className="space-y-6 min-w-0">
              <section className={card}>
                <h2 className={h2}>Registrar un pago</h2>
                <div className="mt-3"><PagoForm clientId={c.id} facturas={facturasAbiertas.map((x) => ({ id: x.id, etiqueta: `${x.number ?? "Factura"} · ${dinero(x.falta)}`, falta: x.falta }))} /></div>
              </section>

              <section className={card}>
                <h2 className={h2}>Horas</h2>
                {f.horasPorFacturar.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    <ul className="space-y-1 text-xs text-fg-dim">{f.horasPorFacturar.slice(0, 6).map((h) => <li key={h.id} className="flex justify-between gap-2"><span className="truncate">{fecha(h.workDate)} · {h.ticket?.number ?? "General"}{h.note ? ` · ${h.note}` : ""}</span><span className="font-mono shrink-0">{dinero(h.amount)}</span></li>)}</ul>
                    <FacturarHorasForm clientId={c.id} monto={dinero(porFacturar)} />
                  </div>
                ) : <p className="mt-2 text-sm text-fg-dim">Sin horas por facturar.</p>}
                <div className="mt-4 border-t border-line pt-4"><p className="text-fg-mute text-sm font-medium mb-2">Registrar horas sin ticket</p><HorasForm clientId={c.id} tarifa={f.tarifa} /></div>
              </section>
            </aside>
          </div>
        ),
        plataformas: (
          <div className="space-y-6 max-w-4xl">
            {plataformas ? (
              <PlataformasCliente clientId={c.id} plataformas={plataformas} className={card} h2={h2} />
            ) : (
              <section className={card} role="alert"><h2 className={h2}>Plataformas</h2><p className="mt-2 text-sm text-danger">No se pudieron cargar las plataformas. Recarga la página; si sigue, revisa la conexión con la base.</p></section>
            )}

                      <section className={card}>
                        <div className="flex items-center justify-between gap-3"><h2 className={h2}>Sistemas</h2><Link href={`/empresa/sistemas/nuevo?cliente=${c.id}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">+ Conectar</Link></div>
                        {f.sistemas.length ? (
                          <ul className="mt-3 divide-y divide-line">
                            {f.sistemas.map((x) => (
                              <li key={x.id}><Link href={`/empresa/sistemas/${x.id}`} className="flex items-center gap-3 py-3 min-h-12 hover:bg-fill -mx-2 px-2 rounded-lg">
                                <span className="min-w-0 flex-1"><span className="block text-fg text-sm font-medium truncate">{x.name}</span><span className="block text-fg-dim text-xs">{x._count.incidents ? `${x._count.incidents} ${x._count.incidents === 1 ? "error abierto" : "errores abiertos"}` : "Sin errores abiertos"}</span></span>
                                <EstadoSistemaPill status={x.status} activo={x.active} />
                              </Link></li>
                            ))}
                          </ul>
                        ) : <p className="mt-2 text-sm text-fg-dim">Conecta los sistemas que le entregaste: Pime te avisa si se caen y el cliente ve si están en línea.</p>}
                      </section>
          </div>
        ),
        cuenta: (
          <div className="space-y-6 max-w-4xl">
            <section className={card}>
              <h2 className={h2}>Cuenta del cliente</h2>
              {f.personas.length > 0 && (
                <ul className="mt-3 divide-y divide-line">
                  {f.personas.map((p) => (
                    <li key={p.id} className="py-3">
                      <p className="text-fg text-sm font-medium truncate">{p.fullName || p.email} <span className="text-fg-faint text-xs">· {p.role === "principal" ? "principal" : "miembro"}</span></p>
                      <p className="text-fg-dim text-xs truncate">{p.email} · {p.status === "invitado" ? `invitado el ${fecha(p.invitedAt)}` : p.lastLoginAt ? `entró ${tiempo(p.lastLoginAt)}` : "activo"}</p>
                      <PersonaAcciones id={p.id} invitado={p.status === "invitado"} />
                    </li>
                  ))}
                </ul>
              )}
              {interna ? (
                <p className="mt-2 text-sm text-fg-dim">Es la empresa interna: no lleva cuenta de cliente ni recibe correos. Sus productos se manejan desde Proyectos y Tickets.</p>
              ) : (
                <div className="mt-4"><InvitarForm clientId={c.id} email={c.email} nombre={c.name} hayPrincipal={!!principal} /></div>
              )}
            </section>
          </div>
        ),
        }}
      />
    </div>
    </ZonaLinea>
  );
}
