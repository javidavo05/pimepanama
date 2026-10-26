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
import { conexionesDeJarvis } from "@/lib/jarvis/conexiones";
import { Jarvis } from "@/components/empresa/jarvis/jarvis";
import { cerebrosDisponibles } from "@/lib/asistente/conversar";
import memoria from "@/lib/jarvis/memoria.json";

export const metadata = { title: "Jarvis — Pime Suite" };
export const dynamic = "force-dynamic";

const usd = (n: number) => `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hora = (d: Date) => d.toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" });
/** Hora decimal en Panamá (UTC-5, sin horario de verano), para la línea de tiempo del día. */
const horaPanama = (d: Date) => { const p = new Date(d.getTime() - 5 * 3600_000); return p.getUTCHours() + p.getUTCMinutes() / 60; };
/** «hace 3 h», «ayer», «hace 4 días»: para lo que pasó, no para lo agendado. */
function hace(d: Date, ahora: number): string {
  const min = Math.max(0, Math.round((ahora - d.getTime()) / 60_000));
  if (min < 60) return min <= 1 ? "recién" : `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? "ayer" : dias < 30 ? `hace ${dias} días` : d.toLocaleDateString("es-PA", { day: "numeric", month: "short", timeZone: "America/Panama" });
}
const PRIORIDAD: Record<string, string> = { ALTA: "mal", MEDIA: "aviso", BAJA: "" };
const TIPO: Record<ItemAgenda["tipo"], string> = { tarea: "Tarea", cita: "Cita", reunion: "Reunión", cuota: "Cobro", factura: "Cobro", evento: "Evento" };
const H0 = 7, H1 = 20;
const pos = (h: number) => `${((Math.min(H1, Math.max(H0, h)) - H0) / (H1 - H0)) * 100}%`;

function Fuente({ texto, estado = "ok" }: { texto: string; estado?: string }) {
  return <span className="jv-src"><i data-e={estado} aria-hidden />{texto}</span>;
}

export default async function JarvisPage({ searchParams }: { searchParams: Promise<{ sin_permiso?: string }> }) {
  const user = await getEmpresaUser();
  const { sin_permiso } = await searchParams;
  // El dinero de la empresa (cifras, cobrar e ingresos) lo ven el dueño y Finanzas.
  const veDinero = puedeVer(user.miembro.area, "dinero");
  const veVentas = puedeVer(user.miembro.area, "leads");
  const veCorreos = puedeVer(user.miembro.area, "correos");
  const veProyectos = puedeVer(user.miembro.area, "proyectos");
  const esDueno = !user.miembro.area || user.miembro.area === "dueno";
  const [d, e, clientes, pagadas] = await Promise.all([
    datosHoy(user.id),
    datosDeLaEmpresa(user.id, { ventas: veVentas, correos: veCorreos }),
    prisma.client.findMany({ where: { userId: user.id, archivedAt: null, internal: false }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true } }),
    prisma.document.findMany({ where: paidInvoiceWhere(user.id), select: PAID_INVOICE_REVENUE_SELECT, orderBy: { issueDate: "asc" } }),
  ]);
  const conexiones = await conexionesDeJarvis(user.id, d.calendario);
  const estadoDe = (id: string) => conexiones.find((c) => c.id === id)?.estado ?? "ok";
  const filas = pagadas.map((x) => ({ issueDate: x.issueDate, ...effectiveInvoiceAmount(x) }));
  const nombre = (user.miembro.fullName || "").split(" ")[0];
  const fecha = new Date().toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Panama" });
  const ahora = Date.now();
  const ahoraH = horaPanama(new Date());

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
  const conHora = d.agenda.filter((a) => a.hora);

  const izquierda = (
    <div className="contents">
      {veDinero && (
        <section key="s1" className="jv-p" data-src="pime" aria-label="Dinero">
          <div className="jv-ph"><h2>Dinero</h2><Fuente texto="Pime" /></div>
          <div className="jv-money">
            <Link href="/empresa/cuentas-por-cobrar" className="jv-mrow" data-e={d.dinero.vencido > 0 ? "mal" : ""}>
              <span>Vencido<small>{d.totalVencidas ? d.totalVencidas === 1 ? "1 factura pasada de fecha" : `${d.totalVencidas} facturas pasadas de fecha` : "Nadie te debe pasado de fecha"}</small></span>
              <b>{usd(d.dinero.vencido)}</b>
            </Link>
            <Link href="/empresa/cuentas-por-cobrar" className="jv-mrow" data-e="info">
              <span>Por cobrar<small>{d.dinero.porVencer > 0 ? `${usd(d.dinero.porVencer)} vence en 3 días` : "Todavía no vence"}</small></span>
              <b>{usd(d.dinero.porCobrar)}</b>
            </Link>
            <Link href="/empresa/dinero" className="jv-mrow" data-e="ok">
              <span>Entró este mes<small>{cambioMes === null ? `Mes pasado: ${usd(d.dinero.entroMesPasado)}` : `${cambioMes >= 0 ? "+" : ""}${cambioMes} % contra el mes pasado`}</small></span>
              <b>{usd(d.dinero.entroMes)}</b>
            </Link>
          </div>
        </section>
      )}
      <section key="s2" className="jv-p" data-src="agenda pime" aria-label="Tu día">
        <div className="jv-ph"><h2>Tu día</h2><Fuente texto={d.calendario.estado === "ok" ? "Agenda · Pime" : "Pime"} estado={estadoDe("agenda") === "aviso" ? "aviso" : "ok"} /></div>
        {!user.calendarFeedToken && (
          <div className="jv-ph">
            <p className="jv-vacio">Ve tus citas, tareas y cobros de Pime en tu Google Calendar.</p>
            <BotonGoogle className="jv-btn" />
          </div>
        )}
        {d.calendario.estado === "error" && <p className="jv-nota" data-e="mal">No pude leer tu Google Calendar: {d.calendario.error} <Link href="/empresa/configuracion" className="jv-link">Revisar</Link></p>}
        {d.tareasAtrasadas > 0 && <p className="jv-nota" data-e="aviso">{d.tareasAtrasadas} {d.tareasAtrasadas === 1 ? "tarea atrasada" : "tareas atrasadas"} de días anteriores</p>}
        {conHora.length > 0 && (
          <div className="jv-tl" aria-hidden>
            {conHora.map((a) => { const h = horaPanama(a.hora!); return <span key={a.id} className="jv-blk" data-paso={h + 0.75 < ahoraH ? "1" : "0"} style={{ left: pos(h), width: `${(0.75 / (H1 - H0)) * 100}%` }} />; })}
            {[8, 11, 14, 17].map((h) => <span key={h} className="jv-hr" style={{ left: pos(h) }}>{h}:00</span>)}
            {ahoraH > H0 && ahoraH < H1 && <span className="jv-nowm" style={{ left: pos(ahoraH) }} />}
          </div>
        )}
        {d.agenda.length === 0 ? (
          <p className="jv-vacio">No tienes nada agendado para hoy. Las tareas que venzan hoy, tus citas, reuniones y cobros del día aparecen aquí.</p>
        ) : (
          <ol className="jv-ag">
            {d.agenda.map((a) => {
              const paso = a.hora ? a.hora.getTime() < ahora - 30 * 60_000 : false;
              const cuerpo = <><span className="jv-h">{a.hora ? hora(a.hora) : "Hoy"}</span><span className="min-w-0"><span className="jv-it">{a.titulo}</span><span className="jv-is">{TIPO[a.tipo]}{a.detalle ? ` · ${a.detalle}` : ""}</span></span></>;
              return <li key={a.id}>{a.href ? <Link href={a.href} data-paso={paso ? "1" : "0"}>{cuerpo}</Link> : <div data-paso={paso ? "1" : "0"}>{cuerpo}</div>}</li>;
            })}
          </ol>
        )}
        <Link href="/empresa/tareas" className="jv-link">Ver tareas</Link>
      </section>
    </div>
  );

  const derecha = (
    <div className="contents">
      <section key="s3" className={`jv-p${hayAlertas ? " jv-alerta" : ""}`} data-src="pime sistemas correo portal" aria-label="Atiende primero">
        <div className="jv-ph"><h2>Atiende primero</h2><Fuente texto="Pime · Sistemas · Correo" estado={hayAlertas ? "aviso" : "ok"} /></div>
        {!hayAlertas ? (
          <p className="jv-vacio">Nada urgente. Aquí aparecen los cobros vencidos, los sistemas caídos, los tickets sin respuesta y las cotizaciones que piden por correo.</p>
        ) : (
          <ul className="jv-list">
            {e.solicitudes.map((x) => (
              <li key={x.id}><Link href={`/empresa/correos/hub/${x.id}`} className="jv-item"><span className="min-w-0"><span className="jv-it">{x.quien} pide cotización</span><span className="jv-is">{x.necesidad} · {hace(x.fecha, ahora)}</span></span><span className="jv-go">Revisar →</span></Link></li>
            ))}
            {d.sistemas.map((s) => (
              <li key={s.id}><Link href={`/empresa/sistemas/${s.id}`} className="jv-item"><span className="min-w-0"><span className="jv-it">{s.nombre} {s.estado === "caido" ? "no responde" : "funciona con fallas"}</span><span className="jv-is">{s.cliente}</span></span><span className="jv-chip" data-e="mal">{s.estado === "caido" ? "Caído" : "Con fallas"}</span></Link></li>
            ))}
            {vencidas.map((v) => (
              <li key={v.id}><Link href={v.href} className="jv-item"><span className="min-w-0"><span className="jv-it">{v.cliente} te debe {usd(v.falta)}</span><span className="jv-is">{v.numero ?? "Factura"} · vencida hace {v.dias} {v.dias === 1 ? "día" : "días"}</span></span><span className="jv-go" data-e="mal">Cobrar →</span></Link></li>
            ))}
            {d.tickets.sinResponder.map((t) => (
              <li key={t.id}><Link href={`/empresa/tickets/${t.id}`} className="jv-item"><span className="min-w-0"><span className="jv-it">{t.cliente} espera respuesta</span><span className="jv-is">{t.numero} · {t.titulo}</span></span><span className="jv-go" data-e={t.urgente ? "mal" : "aviso"}>Responder →</span></Link></li>
            ))}
          </ul>
        )}
        {veDinero && d.totalVencidas > d.vencidas.length && <Link href="/empresa/cuentas-por-cobrar" className="jv-link">Ver las {d.totalVencidas} vencidas</Link>}
      </section>
      <section key="s4" className="jv-p" data-src="pime portal" aria-label="Esperan tu decisión">
        <div className="jv-ph"><h2>Esperan tu decisión</h2><Fuente texto="Pime · Portal" /></div>
        {d.decisiones.length === 0 ? (
          <p className="jv-vacio">Nada pendiente: sin borradores ni pagos por confirmar.</p>
        ) : (
          <ul className="jv-list">
            {d.decisiones.slice(0, 6).map((x) => (
              <li key={x.id}><Link href={x.href} className="jv-item"><span className="min-w-0"><span className="jv-it">{x.titulo}</span><span className="jv-is">{x.detalle}</span></span><span className="jv-go">Abrir →</span></Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  const abajo = (
    <div className="contents">
      {e.ventas && (
        <section key="s5" className="jv-p" data-src="pime correo" aria-label="Ventas">
          <div className="jv-ph"><h2>Ventas</h2><Link href="/empresa/leads" className="jv-link">Leads</Link></div>
          <p className="jv-vacio">
            {e.ventas.abiertos === 1 ? "1 lead abierto" : `${e.ventas.abiertos} leads abiertos`} · {e.ventas.nuevos7 === 1 ? "1 nuevo" : `${e.ventas.nuevos7} nuevos`} esta semana
            {e.ventas.oportunidades.n > 0 && <> · <b className="jv-num" style={{ color: "var(--jv-fg)" }}>{usd(e.ventas.oportunidades.valor)}</b> en {e.ventas.oportunidades.n === 1 ? "1 oportunidad" : `${e.ventas.oportunidades.n} oportunidades`}</>}
          </p>
          <dl className="jv-stages">
            {e.ventas.etapas.map((x) => (
              <Link key={x.etapa} href="/empresa/leads" className="jv-stage-n"><dt><span>{x.label}</span></dt><dd style={{ margin: 0 }}><b>{x.n}</b></dd></Link>
            ))}
          </dl>
          {e.ventas.sinContactar.length === 0 && e.ventas.seguimientos.length === 0 ? (
            <p className="jv-vacio">Todos los leads nuevos ya tienen respuesta y no hay seguimientos atrasados.</p>
          ) : (
            <ul className="jv-list">
              {e.ventas.seguimientos.map((l) => (
                <li key={`s-${l.id}`}><Link href={`/empresa/leads/${l.id}`} className="jv-item"><span className="min-w-0"><span className="jv-it">{l.company ? `${l.name} · ${l.company}` : l.name}</span><span className="jv-is" style={{ color: "var(--jv-amber)" }}>Seguimiento {l.dias === 0 ? "para hoy" : `atrasado ${l.dias} ${l.dias === 1 ? "día" : "días"}`}</span></span><span className="jv-go">Seguir →</span></Link></li>
              ))}
              {e.ventas.sinContactar.map((l) => (
                <li key={`n-${l.id}`}><Link href={`/empresa/leads/${l.id}`} className="jv-item"><span className="min-w-0"><span className="jv-it">{l.company ? `${l.name} · ${l.company}` : l.name}</span><span className="jv-is">Sin contactar hace {l.dias} días · prioridad {l.priority.toLowerCase()}</span></span><span className="jv-go" data-e={PRIORIDAD[l.priority]}>Contactar →</span></Link></li>
              ))}
            </ul>
          )}
        </section>
      )}

      {veProyectos && (
        <section key="s6" className="jv-p" data-src="pime github" aria-label="Proyectos en curso">
          <div className="jv-ph"><h2>Proyectos en curso</h2><Link href="/empresa/proyectos" className="jv-link">{d.proyectos.length > 5 ? `Ver los ${d.proyectos.length}` : "Todos"}</Link></div>
          {d.proyectos.length === 0 ? (
            <p className="jv-vacio">No hay proyectos en curso. Se crean desde Proyectos o al aprobar una cotización.</p>
          ) : (
            <ul className="jv-list">
              {d.proyectos.slice(0, 5).map((p) => (
                <li key={p.id}><Link href={`/empresa/proyectos/${p.id}`} className="jv-item" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
                  <span className="min-w-0">
                    <span className="jv-ph"><span className="jv-it">{p.nombre}</span><span className="jv-num" style={{ fontSize: 14 }}>{Math.round(p.avance)} %</span></span>
                    <span className="jv-bar" aria-hidden><i style={{ transform: `scaleX(${p.avance / 100})` }} /></span>
                    <span className="jv-is">{p.cliente}{p.diasSinActividad !== null && p.diasSinActividad > 14 ? <span style={{ color: "var(--jv-amber)" }}> · {p.diasSinActividad} días sin actividad en GitHub</span> : ""}</span>
                  </span>
                </Link></li>
              ))}
            </ul>
          )}
        </section>
      )}

      {e.correos && (
        <section key="s7" className="jv-p" data-src="correo" aria-label="Comunicación con clientes">
          <div className="jv-ph"><h2>Comunicación con clientes</h2><Link href="/empresa/correos/hub" className="jv-link">Correos</Link></div>
          <p className="jv-vacio">
            {e.correos.totalEsperan
              ? <><b style={{ color: "var(--jv-amber)" }}>{e.correos.totalEsperan === 1 ? "1 conversación espera" : `${e.correos.totalEsperan} conversaciones esperan`}</b> tu respuesta.</>
              : "Nadie espera respuesta tuya este mes."} La IA resume cada correo y lo guarda en la ficha del cliente o lead.
          </p>
          {e.correos.esperan.length > 0 && (
            <ul className="jv-list">
              {e.correos.esperan.map((m) => (
                <li key={`e-${m.id}`}><Link href={`/empresa/correos/hub/${m.id}`} className="jv-item"><span className="min-w-0"><span className="jv-it">{m.nombre}</span><span className="jv-is">{(m.aiSummary && m.aiSummary !== "Sin resumen" ? m.aiSummary : m.subject?.trim()) || "(sin asunto)"} · {hace(m.receivedAt, ahora)}</span></span><span className="jv-go" data-e="aviso">Responder →</span></Link></li>
              ))}
            </ul>
          )}
          {e.pedidos.length > 0 && (
            <>
              <h3 className="jv-k" style={{ margin: 0 }}>Piden cotización por correo</h3>
              <ul className="jv-list">
                {e.pedidos.map((x) => (
                  <li key={`p-${x.id}`}><Link href={x.quien ? `/empresa/${x.quien.tipo === "cliente" ? "clientes" : "leads"}/${x.quien.id}` : `/empresa/correos/hub/${x.id}`} className="jv-item">
                    <span className="min-w-0"><span className="jv-it">{x.nombre}</span><span className="jv-is">{x.necesidad}</span><span className="jv-is">{x.quien ? (x.quien.tipo === "cliente" ? "Cliente" : "Lead") : "Sin aprobar"}{x.valor ? ` · ≈ ${usd(x.valor)}` : ""} · {hace(x.fecha, ahora)}</span></span>
                    <span className="jv-go">{x.quien ? "Ver ficha →" : "Revisar →"}</span>
                  </Link></li>
                ))}
              </ul>
            </>
          )}
          {e.correos.recientes.length === 0 ? (
            <p className="jv-vacio">Cuando escribas o recibas correos de un cliente o lead, aparecen aquí y en su ficha. Si uno no se liga solo, ábrelo y elige de quién es.</p>
          ) : (
            <>
              <h3 className="jv-k" style={{ margin: 0 }}>Lo último</h3>
              <ul className="jv-list">
                {e.correos.recientes.map((m) => (
                  <li key={m.id}><Link href={`/empresa/correos/hub/${m.id}`} className="jv-item" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
                    <span className="min-w-0"><span className="jv-it">{m.recibido ? `${m.quien.nombre} escribió` : `Le escribiste a ${m.quien.nombre}`}</span><span className="jv-is">{m.resumen && m.resumen !== "Sin resumen" ? m.resumen : m.asunto}</span><span className="jv-is">{m.quien.tipo === "cliente" ? "Cliente" : "Lead"} · {hace(m.fecha, ahora)}</span></span>
                  </Link></li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section key="s8" className="jv-p" data-src="portal pime" aria-label="Lo último en las cuentas de clientes">
        <div className="jv-ph"><h2>Lo último en las cuentas de clientes</h2><Fuente texto="Portal" estado={estadoDe("portal") === "ok" ? "ok" : "apagado"} /></div>
        {e.actividad.length === 0 ? (
          <p className="jv-vacio">Aquí sale lo que pasa en las cuentas de tus clientes: pagos, aprobaciones, fases listas y tickets.</p>
        ) : (
          <ol className="jv-list">
            {e.actividad.map((a) => (
              <li key={a.id}><Link href={`/empresa/clientes/${a.clienteId}`} className="jv-item" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
                <span className="min-w-0"><span className="jv-it">{a.titulo}</span><span className="jv-is">{a.cliente}{a.detalle ? ` · ${a.detalle}` : ""}</span><span className="jv-is">{a.delCliente ? "Lo hizo el cliente" : "Pime"} · {hace(a.fecha, ahora)}</span></span>
              </Link></li>
            ))}
          </ol>
        )}
      </section>

      {veDinero && (
        <section key="s9" className="jv-p jv-wide" data-src="pime" aria-label="Ingresos">
          <div className="jv-ph"><h2>Ingresos</h2><Fuente texto="Facturas pagadas" /></div>
          <DashboardRevenueChart monthlyData={buildMonthlyRevenue(filas)} yearlyData={buildYearlyRevenue(filas)} />
        </section>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {sin_permiso && (
        <p role="status" className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          Esa sección no es de tu área del equipo. Si la necesitas, pídele acceso al dueño.
        </p>
      )}
      <Jarvis
        nombre={nombre}
        fecha={fecha}
        resumen={resumen}
        conexiones={conexiones}
        cerebros={cerebrosDisponibles()}
        memoria={esDueno ? memoria as unknown as Parameters<typeof Jarvis>[0]["memoria"] : null}
        principal={veDinero ? <BotonCobrar clientes={clientes.map((c) => ({ id: c.id, nombre: c.company || c.name }))} className="jv-btn" /> : null}
        izquierda={izquierda}
        derecha={derecha}
        abajo={abajo}
      />
    </div>
  );
}
