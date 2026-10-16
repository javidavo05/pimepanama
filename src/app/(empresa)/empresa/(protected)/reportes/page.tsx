import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { puedeVer } from "@/lib/auth/permisos";
import { dinero } from "@/lib/portal/datos";
import { fechaCorta } from "@/lib/format-datetime";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { datosReportes, type DatosReportes } from "@/lib/crm/reportes-datos";
import { PERIODOS, PERIODO_LABEL, periodoValido, antiguedadTexto, type Periodo } from "@/lib/crm/reportes";
import { Seccion, Cifras, Barras, Columnas, Apilada, Vacio, tarjeta } from "./graficas";

export const metadata = { title: "Reportes — Pime Suite" };

const VISTAS = [
  { id: "embudo", label: "Embudo" },
  { id: "pronostico", label: "Pronóstico" },
  { id: "ingresos", label: "Ingresos por cliente" },
  { id: "riesgo", label: "Clientes en riesgo" },
  { id: "satisfaccion", label: "Satisfacción" },
] as const;
type Vista = (typeof VISTAS)[number]["id"];

const mesCorto = (d: Date) => d.toLocaleDateString("es-PA", { month: "short", year: "2-digit", timeZone: "America/Panama" });
const pct = (v: number | null) => (v === null ? "—" : `${v} %`);

/**
 * Reportes del CRM: cómo va el embudo de ventas, qué se espera cerrar, quién nos trae el dinero, qué clientes
 * necesitan atención y qué opinan al terminar un proyecto. ?vista=… y ?periodo=mes|trimestre|anio|todo.
 */
export default async function Reportes({ searchParams }: { searchParams: Promise<{ vista?: string; periodo?: string }> }) {
  const [u, sp] = await Promise.all([getEmpresaUser(), searchParams]);
  const verDinero = puedeVer(u.miembro.area, "dinero");
  const vistas = VISTAS.filter((v) => v.id !== "ingresos" || verDinero);
  const vista: Vista = vistas.some((v) => v.id === sp.vista) ? (sp.vista as Vista) : "embudo";
  const periodo = periodoValido(sp.periodo);
  const d = await datosReportes(u.id, periodo, { verDinero });
  const href = (v: Vista, p: Periodo) => `/empresa/reportes?vista=${v}&periodo=${p}`;
  const usaPeriodo = vista !== "pronostico" && vista !== "riesgo";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Reportes" description="Cómo van las ventas, qué esperamos cobrar, qué clientes necesitan atención y qué opinan al terminar su proyecto." />

      <nav aria-label="Reportes" className="-mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
        <ul className="flex gap-2 min-w-max border-b border-line">
          {vistas.map((v) => {
            const actual = v.id === vista;
            return (
              <li key={v.id}>
                <Link prefetch={null} href={href(v.id, periodo)} aria-current={actual ? "page" : undefined} className={`inline-flex items-center gap-2 min-h-11 px-3 -mb-px border-b-2 text-sm font-semibold transition-colors ${actual ? "border-brand text-fg" : "border-transparent text-fg-dim hover:text-fg"}`}>
                  {v.label}
                  {v.id === "riesgo" && d.riesgo.length > 0 && <span className="rounded-full bg-danger/10 px-2 text-xs text-danger tabular-nums">{d.riesgo.length}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {usaPeriodo ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-fg-dim text-sm">Periodo: {d.desde ? `desde el ${fechaCorta(d.desde)}` : "toda la historia"}</p>
          <div role="group" aria-label="Periodo" className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-panel p-1 sm:inline-grid">
            {PERIODOS.map((p) => (
              <Link key={p} prefetch={null} href={href(vista, p)} aria-current={p === periodo ? "true" : undefined} className={`inline-flex items-center justify-center min-h-11 sm:min-h-9 px-3 rounded-lg text-xs sm:text-sm font-semibold text-center transition-colors ${p === periodo ? "bg-brand text-on-brand" : "text-fg-dim hover:text-fg"}`}>
                {PERIODO_LABEL[p]}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-fg-dim text-sm">{vista === "pronostico" ? "Mira hacia adelante: no depende del periodo." : "Es la foto de hoy: no depende del periodo."}</p>
      )}

      {vista === "embudo" && <Embudo d={d} />}
      {vista === "pronostico" && <Pronostico d={d} />}
      {vista === "ingresos" && verDinero && <Ingresos d={d} periodo={periodo} />}
      {vista === "riesgo" && <Riesgo d={d} />}
      {vista === "satisfaccion" && <Satisfaccion d={d} />}
    </div>
  );
}

function SinOportunidades() {
  return (
    <div className={tarjeta}>
      <Vacio
        titulo="Todavía no hay oportunidades"
        texto="El embudo, la tasa de cierre y el pronóstico salen de las oportunidades de venta. Registra la primera cuando un cliente o un lead pida una propuesta."
        accion={<Link href="/empresa/ventas/nueva" className={btn.primary}>Registrar la primera oportunidad</Link>}
      />
    </div>
  );
}

function Embudo({ d }: { d: DatosReportes }) {
  const e = d.embudo;
  return (
    <div className="space-y-6">
      {d.totalOportunidades === 0 ? <SinOportunidades /> : (
        <>
          <Cifras items={[
            { k: "Oportunidades nuevas", v: e.oportunidades, d: "creadas en el periodo" },
            { k: "Tasa de cierre", v: pct(e.tasaCierre), d: `${e.ganadas} ganadas · ${e.perdidas} perdidas`, tono: "brand" },
            { k: "Tiempo para cerrar", v: e.tiempoCierre === null ? "—" : `${e.tiempoCierre} días`, d: "promedio de las ganadas" },
            { k: "Leads nuevos", v: e.totalLeads, d: "en el periodo" },
          ]} />
          <Seccion titulo="Oportunidades por etapa" leyenda="Cuántas hay en cada etapa y cuánto valen. El porcentaje es cuántas de las que llegaron a una etapa pasaron a la siguiente.">
            {e.oportunidades === 0 ? (
              <Vacio titulo="Ninguna oportunidad nueva en este periodo" texto="Elige un periodo más largo para ver el embudo completo." />
            ) : (
              <Barras etiqueta="Oportunidades por etapa" filas={e.etapas.map((x) => ({
                clave: x.id,
                etiqueta: x.nombre,
                valor: x.cantidad,
                texto: `${x.cantidad} · ${dinero(x.valor)}`,
                tono: x.tipo === "ganada" ? "ok" : x.tipo === "perdida" ? "danger" : "brand",
                detalle: x.tipo === "abierta" && x.conversion !== null ? `${x.conversion} % pasó a la siguiente etapa` : undefined,
              }))} />
            )}
          </Seccion>
          <div className="grid gap-6 lg:grid-cols-2 items-start">
            <Seccion titulo="Ganadas y perdidas por fuente" leyenda="De dónde vienen las ventas que se cierran.">
              {e.porFuente.length ? (
                <Barras etiqueta="Cerradas por fuente" filas={e.porFuente.map((f) => ({
                  clave: f.clave, etiqueta: f.clave, valor: f.ganadas + f.perdidas,
                  texto: `${f.ganadas} de ${f.ganadas + f.perdidas}`,
                  detalle: `${Math.round((f.ganadas / (f.ganadas + f.perdidas)) * 100)} % ganadas · ${dinero(f.valorGanado)} ganado`,
                }))} />
              ) : <Vacio titulo="Sin ventas cerradas en el periodo" texto="Cuando marques una oportunidad como ganada o perdida, aparece aquí con su fuente." />}
            </Seccion>
            <Seccion titulo="Por qué se pierden" leyenda="El motivo que se anotó al marcar cada oportunidad como perdida.">
              {e.porMotivo.length ? (
                <Barras etiqueta="Perdidas por motivo" filas={e.porMotivo.map((m) => ({ clave: m.clave, etiqueta: m.clave, valor: m.cantidad, texto: m.cantidad, detalle: dinero(m.valor), tono: "danger" }))} />
              ) : <Vacio titulo="Ninguna perdida en el periodo" texto="Si se pierde una venta, anota el motivo: aquí se ve qué se repite." />}
            </Seccion>
          </div>
        </>
      )}
      <Seccion titulo="Leads por fuente" leyenda="Cuántos prospectos entraron por cada canal y qué parte se volvió cliente.">
        {e.leads.length ? (
          <Barras etiqueta="Leads por fuente" filas={e.leads.map((l) => ({ clave: l.fuente, etiqueta: l.etiqueta, valor: l.total, texto: l.total, detalle: `${l.convertidos} se volvieron cliente (${l.tasa} %)` }))} />
        ) : (
          <Vacio titulo="Ningún lead en el periodo" texto="Los leads entran por el formulario del sitio o se registran a mano." accion={<Link href="/empresa/leads" className={btn.secondary}>Ir a leads</Link>} />
        )}
      </Seccion>
    </div>
  );
}

function Pronostico({ d }: { d: DatosReportes }) {
  const p = d.pronostico;
  if (d.totalOportunidades === 0) return <SinOportunidades />;
  const abiertas = p.meses.reduce((a, m) => a + m.cantidad, 0);
  return (
    <div className="space-y-6">
      <Cifras items={[
        { k: "Esperado en 6 meses", v: dinero(p.total), d: "valor × probabilidad", tono: "brand" },
        { k: "Oportunidades con fecha", v: abiertas, d: "cierran en los próximos 6 meses" },
        { k: "Sin fecha de cierre", v: dinero(p.sinFecha), d: "ponderado; ponles fecha" },
        { k: "Más adelante", v: dinero(p.despues), d: "después de 6 meses" },
      ]} />
      <Seccion titulo="Lo que esperamos cerrar por mes" leyenda="Valor de las oportunidades abiertas multiplicado por su probabilidad, según el mes de cierre esperado. Las atrasadas cuentan en este mes.">
        {abiertas === 0 ? (
          <Vacio titulo="Ninguna oportunidad abierta con fecha" texto="Ponle fecha de cierre esperada a las oportunidades abiertas para ver el pronóstico." accion={<Link href="/empresa/ventas" className={btn.secondary}>Ir a ventas</Link>} />
        ) : (
          <Columnas etiqueta="Pronóstico por mes" cols={p.meses.map((m) => ({ clave: m.clave, etiqueta: mesCorto(m.inicio), valor: m.ponderado, texto: dinero(m.ponderado), detalle: m.cantidad ? `${m.cantidad} · ${dinero(m.valor)} total` : "—" }))} />
        )}
      </Seccion>
    </div>
  );
}

function Ingresos({ d, periodo }: { d: DatosReportes; periodo: Periodo }) {
  const filas = d.ingresos;
  if (!filas.length) {
    return <div className={tarjeta}><Vacio titulo="Todavía no hay cobros" texto="Cuando un cliente pague una factura, aquí verás quién nos ha traído más dinero." accion={<Link href="/empresa/facturas" className={btn.secondary}>Ir a facturas</Link>} /></div>;
  }
  const delPeriodo = filas.reduce((a, f) => a + f.periodo, 0);
  const vida = filas.reduce((a, f) => a + f.total, 0);
  const conCobro = filas.filter((f) => f.periodo > 0).length;
  return (
    <div className="space-y-6">
      <Cifras items={[
        { k: `Cobrado · ${PERIODO_LABEL[periodo].toLowerCase()}`, v: dinero(delPeriodo), d: `${conCobro} cliente(s) pagaron`, tono: "ok" },
        { k: "Total histórico", v: dinero(vida), d: `${filas.length} cliente(s)` },
        { k: "Valor de vida promedio", v: dinero(vida / filas.length), d: "por cliente" },
        { k: "Ticket promedio", v: dinero(vida / Math.max(1, filas.reduce((a, f) => a + f.pagos, 0))), d: "por pago recibido" },
      ]} />
      <Seccion titulo="Ranking de clientes" leyenda="Ordenado por lo cobrado en el periodo. Se cuenta igual que «Lo que nos ha traído» en la ficha: pagos confirmados y facturas pagadas antes del registro de pagos.">
        <div className="hidden sm:grid grid-cols-[2rem_minmax(0,1fr)_repeat(3,8rem)] gap-3 pb-2 border-b border-line text-fg-faint text-xs" aria-hidden>
          <span>#</span><span>Cliente</span><span className="text-right">En el periodo</span><span className="text-right">De por vida</span><span className="text-right">Ticket promedio</span>
        </div>
        <ol className="divide-y divide-line">
          {filas.map((f, i) => (
            <li key={f.id}>
              <Link href={`/empresa/clientes/${f.id}`} className="grid gap-1 py-3 min-h-12 -mx-2 px-2 rounded-lg hover:bg-fill sm:grid-cols-[2rem_minmax(0,1fr)_repeat(3,8rem)] sm:items-center sm:gap-3">
                <span className="hidden sm:block text-fg-faint text-sm tabular-nums">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-fg text-sm font-medium [overflow-wrap:anywhere]"><span className="sm:hidden tabular-nums text-fg-faint">{i + 1}. </span>{f.nombre}</span>
                  <span className="block text-fg-dim text-xs">Cliente hace {antiguedadTexto(f.meses).toLowerCase()} · {f.pagos} pago(s)</span>
                </span>
                <span className="grid grid-cols-3 gap-2 sm:contents">
                  <span className="sm:text-right"><span className="block text-fg-faint text-xs sm:hidden">Periodo</span><span className={`text-sm tabular-nums font-semibold ${f.periodo > 0 ? "text-ok" : "text-fg-faint"}`}>{dinero(f.periodo)}</span></span>
                  <span className="sm:text-right"><span className="block text-fg-faint text-xs sm:hidden">De por vida</span><span className="text-sm tabular-nums text-fg">{dinero(f.total)}</span></span>
                  <span className="sm:text-right"><span className="block text-fg-faint text-xs sm:hidden">Ticket</span><span className="text-sm tabular-nums text-fg-dim">{dinero(f.ticket)}</span></span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Seccion>
    </div>
  );
}

const NIVEL = {
  riesgo: { label: "En riesgo", clase: "bg-danger/10 text-danger" },
  atencion: { label: "Atención", clase: "bg-warn/10 text-warn" },
  sana: { label: "Sana", clase: "bg-ok/10 text-ok" },
} as const;

function Riesgo({ d }: { d: DatosReportes }) {
  const enRiesgo = d.riesgo.filter((r) => r.nivel === "riesgo").length;
  return (
    <div className="space-y-6">
      <Cifras items={[
        { k: "En riesgo", v: enRiesgo, d: "sistema caído o saldo vencido", tono: enRiesgo ? "danger" : undefined },
        { k: "Necesitan atención", v: d.riesgo.length - enRiesgo, d: "tickets viejos o sin movimiento" },
        { k: "Sin movimiento", v: `> ${d.reglas.diasSinActividad} días`, d: "regla de inactividad" },
        { k: "Ticket viejo", v: `> ${d.reglas.diasTicketViejo} días`, d: "abierto sin resolver" },
      ]} />
      <Seccion titulo="Clientes que necesitan atención" leyenda="Lo más grave primero. El último movimiento cuenta interacciones, mensajes, pagos y lo que pasa en su cuenta.">
        {d.riesgo.length ? (
          <ul className="divide-y divide-line">
            {d.riesgo.map((r) => (
              <li key={r.id}>
                <Link href={`/empresa/clientes/${r.id}`} className="grid gap-2 py-3 min-h-12 -mx-2 px-2 rounded-lg hover:bg-fill sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${NIVEL[r.nivel].clase}`}>{NIVEL[r.nivel].label}</span>
                      <span className="text-fg text-sm font-medium [overflow-wrap:anywhere]">{r.nombre}</span>
                    </span>
                    <span className="mt-1 block text-fg-dim text-sm [overflow-wrap:anywhere]">{r.motivos.map((m) => m.texto).join(" · ")}</span>
                  </span>
                  <span className="text-fg-faint text-xs sm:text-right">{r.ultimoMovimiento ? `Último movimiento: ${fechaCorta(r.ultimoMovimiento)}` : "Sin movimiento registrado"}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Vacio titulo="Todos los clientes están sanos" texto="Ninguno tiene sistemas caídos, saldo vencido, tickets viejos ni lleva mucho sin movimiento." />
        )}
      </Seccion>
    </div>
  );
}

function Satisfaccion({ d }: { d: DatosReportes }) {
  const s = d.satisfaccion;
  if (!s.respondidas) {
    return (
      <div className={tarjeta}>
        <Vacio
          titulo={s.enviadas ? "Todavía no hay respuestas en este periodo" : "Todavía no se ha enviado ninguna encuesta"}
          texto={s.enviadas ? `Se enviaron ${s.enviadas} encuesta(s). Cuando un cliente responda, verás aquí su nota y su comentario.` : "Al terminar un proyecto, el cliente recibe por correo una pregunta: qué tan probable es que nos recomiende. Marca un proyecto como terminado para que salga la primera."}
          accion={<Link href="/empresa/proyectos" className={btn.secondary}>Ir a proyectos</Link>}
        />
      </div>
    );
  }
  const tonoNps = s.nps === null ? undefined : s.nps >= 30 ? "ok" : s.nps < 0 ? "danger" : "brand";
  return (
    <div className="space-y-6">
      <Cifras items={[
        { k: "NPS", v: s.nps === null ? "—" : s.nps > 0 ? `+${s.nps}` : s.nps, d: "promotores menos detractores", tono: tonoNps },
        { k: "Nota promedio", v: s.promedio === null ? "—" : `${s.promedio} / 10` },
        { k: "Respondidas", v: s.respondidas, d: `de ${s.enviadas} enviada(s)` },
        { k: "Tasa de respuesta", v: s.enviadas ? `${Math.round((s.respondidas / s.enviadas) * 100)} %` : "—" },
      ]} />
      <Seccion titulo="Cómo nos califican" leyenda="Promotores dan 9 o 10, pasivos 7 u 8, detractores de 0 a 6.">
        <Apilada etiqueta="Respuestas por grupo" partes={[
          { clave: "d", etiqueta: "Detractores", valor: s.detractores, tono: "danger" },
          { clave: "p", etiqueta: "Pasivos", valor: s.pasivos, tono: "neutro" },
          { clave: "r", etiqueta: "Promotores", valor: s.promotores, tono: "ok" },
        ]} />
      </Seccion>
      <Seccion titulo="Comentarios recientes" leyenda="Lo que escribieron los clientes al responder.">
        {s.comentarios.length ? (
          <ul className="divide-y divide-line">
            {s.comentarios.map((c) => (
              <li key={c.id} className="grid gap-1 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-fg-dim">
                  <span className={`rounded-full px-2 py-1 font-semibold tabular-nums ${c.puntaje === null ? "bg-fill" : c.puntaje >= 9 ? "bg-ok/10 text-ok" : c.puntaje <= 6 ? "bg-danger/10 text-danger" : "bg-fill text-fg"}`}>{c.puntaje ?? "—"} / 10</span>
                  <Link href={`/empresa/clientes/${c.clientId}`} className="inline-flex items-center min-h-11 sm:min-h-0 text-fg font-medium hover:underline [overflow-wrap:anywhere]">{c.cliente}</Link>
                  <span className="[overflow-wrap:anywhere]">· {c.proyecto} · {fechaCorta(c.fecha)}</span>
                </div>
                <p className="text-fg text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">«{c.comentario}»</p>
              </li>
            ))}
          </ul>
        ) : <Vacio titulo="Sin comentarios en el periodo" texto="Las respuestas de este periodo vinieron solo con la nota." />}
      </Seccion>
    </div>
  );
}
