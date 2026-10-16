/**
 * Reportes del CRM (fase 7): embudo, pronóstico, ingresos por cliente, clientes en riesgo y satisfacción.
 * Todo puro: recibe filas ya leídas de la base y devuelve cifras. Las consultas viven en reportes-datos.ts.
 * Fechas en hora de Panamá (UTC−5, sin horario de verano).
 */
import { pagadoEfectivo, FACTURA_CUENTA } from "../portal/saldo";

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const r2 = (x: number) => Math.round(x * 100) / 100;
const DIA = 86_400_000;
const PANAMA = 5 * 3600_000;

// ─── Periodo ─────────────────────────────────────────────────────────────────

export const PERIODOS = ["mes", "trimestre", "anio", "todo"] as const;
export type Periodo = (typeof PERIODOS)[number];
export const PERIODO_LABEL: Record<Periodo, string> = { mes: "Este mes", trimestre: "Este trimestre", anio: "Este año", todo: "Todo" };

export function periodoValido(v: string | undefined | null): Periodo {
  return (PERIODOS as readonly string[]).includes(v ?? "") ? (v as Periodo) : "anio";
}

/** Inicio del periodo en hora de Panamá; null para «todo». El trimestre es el del calendario. */
export function inicioPeriodo(p: Periodo, ahora = new Date()): Date | null {
  if (p === "todo") return null;
  const l = new Date(ahora.getTime() - PANAMA);
  const y = l.getUTCFullYear();
  const m = l.getUTCMonth();
  const mes = p === "mes" ? m : p === "trimestre" ? Math.floor(m / 3) * 3 : 0;
  return new Date(Date.UTC(y, mes, 1) + PANAMA);
}

export const enPeriodo = (d: Date | null | undefined, desde: Date | null) => !!d && (!desde || d.getTime() >= desde.getTime());

/** «2026-10» del mes de una fecha en Panamá. */
export function claveMes(d: Date): string {
  const l = new Date(d.getTime() - PANAMA);
  return `${l.getUTCFullYear()}-${String(l.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ─── Embudo ──────────────────────────────────────────────────────────────────

export type Etapa = { id: string; nombre: string; orden: number; tipo: string };
export type Opo = {
  id: string;
  etapaId: string;
  estado: string;
  valor: unknown;
  probabilidad: number;
  cierreEsperado: Date | null;
  createdAt: Date;
  cerradaAt: Date | null;
  motivoPerdida: string | null;
  fuente: string | null;
};

export type FilaEtapa = { id: string; nombre: string; tipo: string; cantidad: number; valor: number; alcanzaron: number; conversion: number | null };

/**
 * Oportunidades por etapa (cantidad y valor de las que están ahí hoy) y conversión entre etapas abiertas.
 * La base no guarda el historial de etapas, así que «llegó a la etapa» se aproxima así: una abierta llegó hasta
 * la suya; una ganada pasó por todas; una perdida sin etapa abierta conocida solo cuenta en la primera.
 * `conversion` de una etapa es qué parte de las que llegaron a ella llegó también a la siguiente.
 */
export function embudo(etapas: Etapa[], opos: Opo[]): FilaEtapa[] {
  const orden = [...etapas].sort((a, b) => a.orden - b.orden);
  const abiertas = orden.filter((e) => e.tipo === "abierta");
  const ordenDe = new Map(abiertas.map((e, i) => [e.id, i]));
  const hasta = (o: Opo): number => {
    if (o.estado === "ganada") return abiertas.length;
    const i = ordenDe.get(o.etapaId);
    if (i !== undefined) return i;
    return 0;
  };
  const alcanzaron = abiertas.map((_, i) => opos.filter((o) => hasta(o) >= i).length);
  return orden.map((e) => {
    const aqui = opos.filter((o) => o.etapaId === e.id);
    const i = ordenDe.get(e.id);
    const llegaron = i === undefined ? aqui.length : alcanzaron[i];
    const siguiente = i === undefined ? null : i + 1 < abiertas.length ? alcanzaron[i + 1] : opos.filter((o) => o.estado === "ganada").length;
    return {
      id: e.id,
      nombre: e.nombre,
      tipo: e.tipo,
      cantidad: aqui.length,
      valor: r2(aqui.reduce((a, o) => a + n(o.valor), 0)),
      alcanzaron: llegaron,
      conversion: siguiente === null || !llegaron ? null : Math.round((siguiente / llegaron) * 100),
    };
  });
}

/** Ganadas sobre cerradas (ganadas + perdidas), en %. null si no se ha cerrado ninguna. */
export function tasaCierre(opos: Pick<Opo, "estado">[]): number | null {
  const g = opos.filter((o) => o.estado === "ganada").length;
  const p = opos.filter((o) => o.estado === "perdida").length;
  return g + p ? Math.round((g / (g + p)) * 100) : null;
}

/** Días promedio de creación a cierre de las ganadas. null si no hay ganadas con fecha de cierre. */
export function tiempoCierreDias(opos: Pick<Opo, "estado" | "createdAt" | "cerradaAt">[]): number | null {
  const g = opos.filter((o) => o.estado === "ganada" && o.cerradaAt);
  if (!g.length) return null;
  const dias = g.reduce((a, o) => a + Math.max(0, (o.cerradaAt!.getTime() - o.createdAt.getTime()) / DIA), 0) / g.length;
  return Math.round(dias * 10) / 10;
}

export type Grupo = { clave: string; ganadas: number; perdidas: number; valorGanado: number };

/** Cerradas agrupadas por fuente (ganadas y perdidas), de más a menos. */
export function cerradasPorFuente(opos: Opo[]): Grupo[] {
  const m = new Map<string, Grupo>();
  for (const o of opos) {
    if (o.estado !== "ganada" && o.estado !== "perdida") continue;
    const clave = o.fuente?.trim() || "Sin fuente";
    const g = m.get(clave) ?? { clave, ganadas: 0, perdidas: 0, valorGanado: 0 };
    if (o.estado === "ganada") { g.ganadas++; g.valorGanado = r2(g.valorGanado + n(o.valor)); } else g.perdidas++;
    m.set(clave, g);
  }
  return [...m.values()].sort((a, b) => b.ganadas + b.perdidas - (a.ganadas + a.perdidas));
}

/** Perdidas por motivo, de más a menos. */
export function perdidasPorMotivo(opos: Opo[]): { clave: string; cantidad: number; valor: number }[] {
  const m = new Map<string, { clave: string; cantidad: number; valor: number }>();
  for (const o of opos) {
    if (o.estado !== "perdida") continue;
    const clave = o.motivoPerdida?.trim() || "Sin motivo anotado";
    const g = m.get(clave) ?? { clave, cantidad: 0, valor: 0 };
    g.cantidad++;
    g.valor = r2(g.valor + n(o.valor));
    m.set(clave, g);
  }
  return [...m.values()].sort((a, b) => b.cantidad - a.cantidad);
}

export const FUENTE_LEAD_LABEL: Record<string, string> = {
  REFERIDO: "Referido",
  WEB: "Sitio web",
  REDES_SOCIALES: "Redes sociales",
  FERIA: "Feria o evento",
  LLAMADA_FRIA: "Llamada fría",
  OTRO: "Otro",
};

/** Leads por fuente y cuántos se volvieron cliente (convertedAt). */
export function leadsPorFuente(leads: { source: string; convertedAt: Date | null }[]) {
  const m = new Map<string, { fuente: string; total: number; convertidos: number }>();
  for (const l of leads) {
    const g = m.get(l.source) ?? { fuente: l.source, total: 0, convertidos: 0 };
    g.total++;
    if (l.convertedAt) g.convertidos++;
    m.set(l.source, g);
  }
  return [...m.values()]
    .map((g) => ({ ...g, etiqueta: FUENTE_LEAD_LABEL[g.fuente] ?? g.fuente, tasa: Math.round((g.convertidos / g.total) * 100) }))
    .sort((a, b) => b.total - a.total);
}

// ─── Pronóstico ──────────────────────────────────────────────────────────────

export type MesPronostico = { clave: string; inicio: Date; valor: number; ponderado: number; cantidad: number };

/**
 * Valor abierto ponderado (valor × probabilidad) por mes de cierre esperado, del mes actual a `meses` adelante.
 * Las que ya debían cerrar y siguen abiertas caen en el mes actual (siguen en juego); las que no tienen fecha
 * o caen más allá se suman aparte.
 */
export function pronostico(opos: Opo[], ahora = new Date(), meses = 6) {
  const l = new Date(ahora.getTime() - PANAMA);
  const base: MesPronostico[] = Array.from({ length: meses }, (_, i) => {
    const inicio = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth() + i, 1) + PANAMA);
    return { clave: claveMes(inicio), inicio, valor: 0, ponderado: 0, cantidad: 0 };
  });
  const idx = new Map(base.map((m, i) => [m.clave, i]));
  let sinFecha = 0, despues = 0;
  for (const o of opos) {
    if (o.estado !== "abierta") continue;
    const pond = n(o.valor) * Math.min(100, Math.max(0, o.probabilidad)) / 100;
    if (!o.cierreEsperado) { sinFecha = r2(sinFecha + pond); continue; }
    const i = o.cierreEsperado.getTime() < base[0].inicio.getTime() ? 0 : idx.get(claveMes(o.cierreEsperado));
    if (i === undefined) { despues = r2(despues + pond); continue; }
    base[i].valor = r2(base[i].valor + n(o.valor));
    base[i].ponderado = r2(base[i].ponderado + pond);
    base[i].cantidad++;
  }
  return { meses: base, total: r2(base.reduce((a, m) => a + m.ponderado, 0)), sinFecha, despues };
}

// ─── Satisfacción ────────────────────────────────────────────────────────────

/** NPS: % de promotores (9–10) menos % de detractores (0–6), sobre las respondidas. */
export function nps(puntajes: (number | null | undefined)[]) {
  const v = puntajes.filter((p): p is number => typeof p === "number" && p >= 0 && p <= 10);
  const promotores = v.filter((p) => p >= 9).length;
  const detractores = v.filter((p) => p <= 6).length;
  const pasivos = v.length - promotores - detractores;
  return {
    respondidas: v.length,
    promedio: v.length ? Math.round((v.reduce((a, p) => a + p, 0) / v.length) * 10) / 10 : null,
    promotores,
    pasivos,
    detractores,
    nps: v.length ? Math.round(((promotores - detractores) / v.length) * 100) : null,
  };
}

// ─── Dinero vencido ──────────────────────────────────────────────────────────

type FacturaVence = { id: string; status: string; total: unknown; amountPaid?: unknown; dueDate: Date | null; paymentSchedules?: { amount: unknown; dueDate: Date; status: string }[] };
type PagoVence = { documentId?: string | null; amount: unknown; status: string };

/**
 * Lo vencido de un cliente: de cada factura viva con saldo, las cuotas ya vencidas sin pagar si tiene plan;
 * si no tiene plan, todo su saldo cuando ya pasó su vencimiento.
 */
export function vencidoDeFacturas(facturas: FacturaVence[], pagos: PagoVence[], ahora = new Date()): number {
  let total = 0;
  for (const f of facturas) {
    if (!FACTURA_CUENTA(f.status) || f.status === "PAID") continue;
    const falta = Math.max(0, n(f.total) - pagadoEfectivo(f, pagos));
    if (falta <= 0.005) continue;
    const cuotas = (f.paymentSchedules ?? []).filter((c) => c.status !== "PAID" && c.status !== "CANCELLED");
    if (cuotas.length) total += Math.min(falta, cuotas.filter((c) => c.dueDate.getTime() < ahora.getTime()).reduce((a, c) => a + n(c.amount), 0));
    else if (f.dueDate && f.dueDate.getTime() < ahora.getTime()) total += falta;
  }
  return r2(total);
}

// ─── Salud del cliente ───────────────────────────────────────────────────────

export type ReglasRiesgo = { diasSinActividad: number; diasTicketViejo: number };
export const REGLAS_RIESGO: ReglasRiesgo = { diasSinActividad: 45, diasTicketViejo: 14 };

/** Reglas desde CompanyConfig.reglasCrm ({ diasSinActividad, diasTicketViejo }); lo que falte usa el valor por omisión. */
export function reglasRiesgo(json: unknown): ReglasRiesgo {
  const o = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const dias = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.round(v) : d);
  return { diasSinActividad: dias(o.diasSinActividad, REGLAS_RIESGO.diasSinActividad), diasTicketViejo: dias(o.diasTicketViejo, REGLAS_RIESGO.diasTicketViejo) };
}

export type Nivel = "sana" | "atencion" | "riesgo";
export type Motivo = { tipo: "sistema" | "vencido" | "ticket" | "inactivo"; grave: boolean; texto: string };

export type DatosSalud = {
  ultimoMovimiento: Date | null;
  vencido: number;
  ticketsAbiertos: { number: string; createdAt: Date }[];
  sistemas: { name: string; status: string }[];
  /** Si el que mira puede ver montos (área con «dinero»). */
  verMontos?: boolean;
};

const fmt = new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/**
 * Salud de un cliente. En riesgo: un sistema caído o saldo vencido. Atención: sistema con fallas, tickets
 * abiertos más viejos que la regla o sin movimiento en más días de los de la regla. Sana: nada de eso.
 * Los motivos van de lo más grave a lo menos.
 */
export function saludCliente(d: DatosSalud, reglas: ReglasRiesgo = REGLAS_RIESGO, ahora = new Date()): { nivel: Nivel; motivos: Motivo[] } {
  const motivos: Motivo[] = [];
  const caidos = d.sistemas.filter((s) => s.status === "caido");
  const degradados = d.sistemas.filter((s) => s.status === "degradado");
  if (caidos.length) motivos.push({ tipo: "sistema", grave: true, texto: caidos.length === 1 ? `${caidos[0].name} está caído` : `${caidos.length} sistemas caídos` });
  if (d.vencido > 0.005) motivos.push({ tipo: "vencido", grave: true, texto: d.verMontos === false ? "Tiene saldo vencido" : `${fmt.format(d.vencido)} vencido` });
  if (degradados.length) motivos.push({ tipo: "sistema", grave: false, texto: degradados.length === 1 ? `${degradados[0].name} con fallas` : `${degradados.length} sistemas con fallas` });
  const viejos = d.ticketsAbiertos.filter((t) => (ahora.getTime() - t.createdAt.getTime()) / DIA > reglas.diasTicketViejo);
  if (viejos.length) {
    const max = Math.floor(Math.max(...viejos.map((t) => (ahora.getTime() - t.createdAt.getTime()) / DIA)));
    motivos.push({ tipo: "ticket", grave: false, texto: viejos.length === 1 ? `Ticket ${viejos[0].number} abierto hace ${max} días` : `${viejos.length} tickets abiertos, el más viejo de hace ${max} días` });
  }
  const sin = d.ultimoMovimiento ? Math.floor((ahora.getTime() - d.ultimoMovimiento.getTime()) / DIA) : null;
  if (sin === null) motivos.push({ tipo: "inactivo", grave: false, texto: "Sin movimiento registrado" });
  else if (sin > reglas.diasSinActividad) motivos.push({ tipo: "inactivo", grave: false, texto: `Sin movimiento hace ${sin} días` });
  const nivel: Nivel = motivos.some((m) => m.grave) ? "riesgo" : motivos.length ? "atencion" : "sana";
  return { nivel, motivos };
}

/** La fecha más reciente de una lista (ignora vacíos). */
export function masReciente(...fechas: (Date | null | undefined)[]): Date | null {
  let m: Date | null = null;
  for (const f of fechas) if (f && (!m || f.getTime() > m.getTime())) m = f;
  return m;
}

/** Meses completos entre dos fechas (antigüedad del cliente). */
export function mesesEntre(desde: Date, hasta = new Date()): number {
  const a = new Date(desde.getTime() - PANAMA), b = new Date(hasta.getTime() - PANAMA);
  return Math.max(0, (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() - (b.getUTCDate() < a.getUTCDate() ? 1 : 0));
}

export function antiguedadTexto(meses: number): string {
  if (meses < 1) return "Menos de un mes";
  if (meses < 12) return `${meses} ${meses === 1 ? "mes" : "meses"}`;
  const a = Math.floor(meses / 12), m = meses % 12;
  return `${a} ${a === 1 ? "año" : "años"}${m ? ` y ${m} ${m === 1 ? "mes" : "meses"}` : ""}`;
}
