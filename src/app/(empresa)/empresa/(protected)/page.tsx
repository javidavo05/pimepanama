import Link from "@/components/empresa/link";
import { puedeVer } from "@/lib/auth/permisos";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { datosHoy, type ItemAgenda } from "@/lib/motor/hoy";
import { BotonCobrar } from "@/components/empresa/cobrar/asistente-cobrar";
import { BotonGoogle } from "@/components/empresa/calendario/pime-en-google";
import { LazyDashboardRevenueChart as DashboardRevenueChart } from "@/components/empresa/revenue-chart-lazy";
import { buildMonthlyRevenue, buildYearlyRevenue } from "@/lib/revenue-helpers";
import { PAID_INVOICE_REVENUE_SELECT, paidInvoiceWhere, effectiveInvoiceAmount } from "@/lib/invoice-revenue";
import { datosDeLaEmpresa } from "@/lib/motor/empresa-hoy";

export const metadata = { title: "Hoy — Pime Suite" };
export const dynamic = "force-dynamic";

const usd = (n: number) => `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
const h2 = "text-fg text-base font-semibold tracking-tight";
const hora = (d: Date) => d.toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" });
const enlace = "inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline";
const fila = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 min-h-12";
/** «hace 3 h», «ayer», «hace 4 días»: para lo que pasó, no para lo agendado. */
function hace(d: Date, ahora: number): string {
  const min = Math.max(0, Math.round((ahora - d.getTime()) / 60_000));
  if (min < 60) return min <= 1 ? "recién" : `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? "ayer" : dias < 30 ? `hace ${dias} días` : d.toLocaleDateString("es-PA", { day: "numeric", month: "short", timeZone: "America/Panama" });
}
const PRIORIDAD: Record<string, string> = { ALTA: "text-danger", MEDIA: "text-warn", BAJA: "text-fg-dim" };
const TIPO: Record<ItemAgenda["tipo"], string> = { tarea: "Tarea", cita: "Cita", reunion: "Reunión", cuota: "Cobro", factura: "Cobro", evento: "Evento" };

export default async function HoyPage({ searchParams }: { searchParams: Promise<{ sin_permiso?: string }> }) {
  const user = await getEmpresaUser();
  const { sin_permiso } = await searchParams;
  // El dinero de la empresa (cifras, cobrar e ingresos) lo ven el dueño y Finanzas.
  const veDinero = puedeVer(user.miembro.area, "dinero");
  const veVentas = puedeVer(user.miembro.area, "leads");
  const veCorreos = puedeVer(user.miembro.area, "correos");
  const veProyectos = puedeVer(user.miembro.area, "proyectos");
  const [d, e, clientes, pagadas] = await Promise.all([
    datosHoy(user.id),
    datosDeLaEmpresa(user.id, { ventas: veVentas, correos: veCorreos }),
    prisma.client.findMany({ where: { userId: user.id, archivedAt: null, internal: false }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true } }),
    prisma.document.findMany({ where: paidInvoiceWhere(user.id), select: PAID_INVOICE_REVENUE_SELECT, orderBy: { issueDate: "asc" } }),
  ]);
  const filas = pagadas.map((x) => ({ issueDate: x.issueDate, ...effectiveInvoiceAmount(x) }));
  const nombre = (user.miembro.fullName || "").split(" ")[0];
  const fecha = new Date().toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Panama" });
  const ahora = Date.now();

  const resumen = [
    d.agenda.length ? `${d.agenda.length} ${d.agenda.length === 1 ? "cosa en la agenda" : "cosas en la agenda"}` : null,
    veDinero && d.totalVencidas ? `${d.totalVencidas} ${d.totalVencidas === 1 ? "cobro vencido" : "cobros vencidos"}` : null,
    d.sistemas.length ? `${d.sistemas.length} ${d.sistemas.length === 1 ? "sistema con problemas" : "sistemas con problemas"}` : null,
    e.solicitudes.length ? `${e.solicitudes.length} ${e.solicitudes.length === 1 ? "solicitud por correo por aprobar" : "solicitudes por correo por aprobar"}` : null,
    e.correos?.totalEsperan ? `${e.correos.totalEsperan} ${e.correos.totalEsperan === 1 ? "correo espera respuesta" : "correos esperan respuesta"}` : null,
  ].filter(Boolean).join(" · ") || "Nada urgente: todo al día.";
  // Sin acceso al dinero, los cobros vencidos no son una alerta para este miembro.
  const vencidas = veDinero ? d.vencidas : [];
  const hayAlertas = vencidas.length > 0 || d.sistemas.length > 0 || d.tickets.sinResponder.length > 0 || e.solicitudes.length > 0;
  const cambioMes = d.dinero.entroMesPasado > 0 ? Math.round(((d.dinero.entroMes - d.dinero.entroMesPasado) / d.dinero.entroMesPasado) * 100) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {sin_permiso && (
        <p role="status" className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          Esa sección no es de tu área del equipo. Si la necesitas, pídele acceso al dueño.
        </p>
      )}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-fg-dim text-sm first-letter:uppercase">{fecha}</p>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">{nombre ? `Hola, ${nombre}` : "Hoy"}</h1>
          <p className="text-fg-mute text-sm mt-1">{resumen}</p>
        </div>
        {veDinero && <BotonCobrar clientes={clientes.map((c) => ({ id: c.id, nombre: c.company || c.name }))} className="inline-flex items-center justify-center min-h-12 sm:min-h-11 px-6 rounded-xl bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hi" />}
      </header>

      {/* Dinero con colores: rojo vencido, azul por cobrar, verde entró. */}
      {veDinero && <section aria-label="Dinero" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      </section>}

      {hayAlertas && (
        <section className={`${card} border-danger/30`} aria-label="Alertas">
          <h2 className={`${h2} text-danger`}>Atiende primero</h2>
          <ul className="mt-3 divide-y divide-line">
            {e.solicitudes.map((x) => (
              <li key={x.id}><Link href={`/empresa/correos/hub/${x.id}`} className={fila}>
                <span className="min-w-0"><span className="block text-fg text-sm font-semibold [overflow-wrap:anywhere]">{x.quien} pide cotización</span><span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">{x.necesidad} · {hace(x.fecha, ahora)}</span></span>
                <span className="text-brand-fg text-sm font-semibold whitespace-nowrap">Revisar →</span>
              </Link></li>
            ))}
            {d.sistemas.map((s) => (
              <li key={s.id}><Link href={`/empresa/sistemas/${s.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 min-h-12">
                <span className="min-w-0"><span className="block text-fg text-sm font-semibold truncate">{s.nombre} {s.estado === "caido" ? "no responde" : "funciona con fallas"}</span><span className="block text-fg-dim text-xs truncate">{s.cliente}</span></span>
                <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">{s.estado === "caido" ? "Caído" : "Con fallas"}</span>
              </Link></li>
            ))}
            {vencidas.map((v) => (
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
          {veDinero && d.totalVencidas > d.vencidas.length && <Link href="/empresa/cuentas-por-cobrar" className="mt-2 inline-flex items-center min-h-11 text-sm font-semibold text-danger hover:underline">Ver las {d.totalVencidas} vencidas</Link>}
        </section>
      )}

      {/* Dos columnas parejas: cada fila empareja dos bloques del mismo peso. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card} aria-label="Agenda de hoy">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={h2}>Tu día</h2>
            <Link href="/empresa/tareas" className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">Tareas</Link>
          </div>
          {!user.calendarFeedToken && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand/5 px-4 py-3">
              <p className="text-sm text-fg-mute">Ve tus citas, tareas y cobros de Pime en tu Google Calendar.</p>
              <BotonGoogle className="inline-flex items-center min-h-11 px-4 rounded-lg bg-brand text-on-brand text-sm font-semibold" />
            </div>
          )}
          {d.calendario.estado === "error" && <p className="mt-2 text-sm text-danger">No pude leer tu Google Calendar: {d.calendario.error} <Link href="/empresa/configuracion" className="underline font-semibold">Revisar</Link></p>}
          {d.tareasAtrasadas > 0 && <p className="mt-2 text-sm text-warn font-semibold">{d.tareasAtrasadas} {d.tareasAtrasadas === 1 ? "tarea atrasada" : "tareas atrasadas"} de días anteriores</p>}
          {d.agenda.length === 0 ? (
            <div className="mt-4 rounded-xl bg-fill p-4 text-sm text-fg-dim">No tienes nada agendado para hoy. Las tareas que venzan hoy, tus citas, reuniones y cobros del día aparecen aquí. </div>
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

        {e.ventas && (
          <section className={card} aria-label="Ventas">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={h2}>Ventas</h2>
              <Link href="/empresa/leads" className={enlace}>Leads</Link>
            </div>
            <p className="mt-1 text-sm text-fg-dim">
              {e.ventas.abiertos === 1 ? "1 lead abierto" : `${e.ventas.abiertos} leads abiertos`} · {e.ventas.nuevos7 === 1 ? "1 nuevo" : `${e.ventas.nuevos7} nuevos`} esta semana
              {e.ventas.oportunidades.n > 0 && <> · <b className="font-semibold text-fg tabular-nums">{usd(e.ventas.oportunidades.valor)}</b> en {e.ventas.oportunidades.n === 1 ? "1 oportunidad" : `${e.ventas.oportunidades.n} oportunidades`}</>}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {e.ventas.etapas.map((x) => (
                <Link key={x.etapa} href="/empresa/leads" className="min-w-0 rounded-xl border border-line bg-fill px-2 py-2 sm:px-3">
                  <dt className="truncate text-xs font-medium text-fg-dim">{x.label}</dt>
                  <dd className="text-lg font-semibold tabular-nums text-fg">{x.n}</dd>
                </Link>
              ))}
            </dl>
            {e.ventas.sinContactar.length === 0 && e.ventas.seguimientos.length === 0 ? (
              <p className="mt-4 text-sm text-fg-dim">Todos los leads nuevos ya tienen respuesta y no hay seguimientos atrasados.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {e.ventas.seguimientos.map((l) => (
                  <li key={`s-${l.id}`}><Link href={`/empresa/leads/${l.id}`} className={fila}>
                    <span className="min-w-0"><span className="block text-fg text-sm font-semibold truncate">{l.company ? `${l.name} · ${l.company}` : l.name}</span><span className="block text-warn text-xs font-semibold">Seguimiento {l.dias === 0 ? "para hoy" : `atrasado ${l.dias} ${l.dias === 1 ? "día" : "días"}`}</span></span>
                    <span className="text-brand-fg text-sm font-semibold whitespace-nowrap">Seguir →</span>
                  </Link></li>
                ))}
                {e.ventas.sinContactar.map((l) => (
                  <li key={`n-${l.id}`}><Link href={`/empresa/leads/${l.id}`} className={fila}>
                    <span className="min-w-0"><span className="block text-fg text-sm font-semibold truncate">{l.company ? `${l.name} · ${l.company}` : l.name}</span><span className="block text-fg-dim text-xs">Sin contactar hace {l.dias} días · <span className={`font-semibold ${PRIORIDAD[l.priority]}`}>prioridad {l.priority.toLowerCase()}</span></span></span>
                    <span className="text-brand-fg text-sm font-semibold whitespace-nowrap">Contactar →</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </section>
        )}

        {veProyectos && (
          <section className={card} aria-label="Proyectos en curso">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={h2}>Proyectos en curso</h2>
              <Link href="/empresa/proyectos" className={enlace}>{d.proyectos.length > 5 ? `Ver los ${d.proyectos.length}` : "Todos"}</Link>
            </div>
            {d.proyectos.length === 0 ? (
              <p className="mt-2 text-sm text-fg-dim">No hay proyectos en curso.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {d.proyectos.slice(0, 5).map((p) => (
                  <li key={p.id}><Link href={`/empresa/proyectos/${p.id}`} className="block space-y-2">
                    <span className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3"><span className="min-w-0 truncate text-fg text-sm font-semibold">{p.nombre}</span><span className="text-fg text-sm tabular-nums whitespace-nowrap">{Math.round(p.avance)} %</span></span>
                    <span className="block h-1.5 rounded-full bg-fill-3 overflow-hidden"><span className="block h-full bg-brand origin-left" style={{ transform: `scaleX(${p.avance / 100})` }} /></span>
                    <span className="block text-fg-dim text-xs truncate">{p.cliente}{p.diasSinActividad !== null && p.diasSinActividad > 14 ? <span className="text-warn font-semibold"> · {p.diasSinActividad} días sin actividad en GitHub</span> : ""}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </section>
        )}
        {e.correos && (
          <section className={card} aria-label="Comunicación con clientes">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={h2}>Comunicación con clientes</h2>
              <Link href="/empresa/correos/hub" className={enlace}>Correos</Link>
            </div>
            <p className="mt-1 text-sm text-fg-dim">
              {e.correos.totalEsperan
                ? <><b className="font-semibold text-warn">{e.correos.totalEsperan === 1 ? "1 conversación espera" : `${e.correos.totalEsperan} conversaciones esperan`}</b> tu respuesta.</>
                : "Nadie espera respuesta tuya este mes."} Los correos con clientes y leads se guardan solos en su ficha.
            </p>
            {e.correos.esperan.length > 0 && (
              <ul className="mt-3 divide-y divide-line">
                {e.correos.esperan.map((m) => (
                  <li key={`e-${m.id}`}><Link href={`/empresa/correos/hub/${m.id}`} className={fila}>
                    <span className="min-w-0"><span className="block text-fg text-sm font-semibold truncate">{m.nombre}</span><span className="block text-fg-dim text-xs truncate">{m.subject?.trim() || "(sin asunto)"} · {hace(m.receivedAt, ahora)}</span></span>
                    <span className="text-warn text-sm font-semibold whitespace-nowrap">Responder →</span>
                  </Link></li>
                ))}
              </ul>
            )}
            {e.correos.recientes.length === 0 ? (
              <p className="mt-4 rounded-xl bg-fill p-4 text-sm text-fg-dim">Cuando escribas o recibas correos de un cliente o lead, aparecen aquí y en su ficha. Si uno no se liga solo, ábrelo y elige de quién es.</p>
            ) : (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-fg-dim">Lo último</p>
                <ul className="mt-1 divide-y divide-line">
                  {e.correos.recientes.map((m) => (
                    <li key={m.id}><Link href={`/empresa/correos/hub/${m.id}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-3 min-h-12">
                      <span className={`mt-1.5 h-2 w-2 rounded-full ${m.recibido ? "bg-ok" : "bg-brand"}`} aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-fg text-sm font-semibold truncate">{m.recibido ? `${m.quien.nombre} escribió` : `Le escribiste a ${m.quien.nombre}`}</span>
                        <span className="block text-fg-dim text-xs truncate">{m.asunto}</span>
                        <span className="block text-fg-faint text-xs">{m.quien.tipo === "cliente" ? "Cliente" : "Lead"} · {hace(m.fecha, ahora)}</span>
                      </span>
                    </Link></li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <section className={card} aria-label="Lo último en la empresa">
          <h2 className={h2}>Lo último en las cuentas de clientes</h2>
          {e.actividad.length === 0 ? (
            <p className="mt-2 text-sm text-fg-dim">Aquí sale lo que pasa en las cuentas de tus clientes: pagos, aprobaciones, fases listas y tickets.</p>
          ) : (
            <ol className="mt-3 divide-y divide-line">
              {e.actividad.map((a) => (
                <li key={a.id}><Link href={`/empresa/clientes/${a.clienteId}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-3 min-h-12">
                  <span className={`mt-1.5 h-2 w-2 rounded-full ${a.delCliente ? "bg-ok" : "bg-fg-faint"}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-fg text-sm font-semibold [overflow-wrap:anywhere]">{a.titulo}</span>
                    <span className="block text-fg-dim text-xs truncate">{a.cliente}{a.detalle ? ` · ${a.detalle}` : ""}</span>
                    <span className="block text-fg-faint text-xs">{a.delCliente ? "Lo hizo el cliente" : "Pime"} · {hace(a.fecha, ahora)}</span>
                  </span>
                </Link></li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {veDinero && (
        <section className={card} aria-label="Ingresos">
          <DashboardRevenueChart monthlyData={buildMonthlyRevenue(filas)} yearlyData={buildYearlyRevenue(filas)} />
        </section>
      )}
    </div>
  );
}
