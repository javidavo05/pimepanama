/**
 * Embudo de ventas: lógica pura (sin base de datos) para etapas, totales, pronóstico y conversión de leads.
 * Lo usan el tablero de /empresa/ventas, el detalle de cada oportunidad y la conversión de un lead ganado.
 */

export type TipoEtapa = "abierta" | "ganada" | "perdida";
export type EstadoOportunidad = "abierta" | "ganada" | "perdida";

export type EtapaBase = { id: string; nombre: string; orden: number; probabilidad: number; tipo: string };
export type OportunidadBase = {
  id: string;
  etapaId: string;
  valor: number;
  probabilidad: number;
  estado: string;
  cerradaAt?: Date | string | null;
};

/** Las etapas con las que arranca un dueño que todavía no tiene embudo (las mismas que tenían los leads). */
export const ETAPAS_INICIALES: { nombre: string; probabilidad: number; tipo: TipoEtapa }[] = [
  { nombre: "Nuevo", probabilidad: 10, tipo: "abierta" },
  { nombre: "Contactado", probabilidad: 20, tipo: "abierta" },
  { nombre: "Cotizando", probabilidad: 40, tipo: "abierta" },
  { nombre: "Negociación", probabilidad: 70, tipo: "abierta" },
  { nombre: "Ganado", probabilidad: 100, tipo: "ganada" },
  { nombre: "Perdido", probabilidad: 0, tipo: "perdida" },
];

/** De dónde llegó el negocio. Mismo vocabulario que los leads (LeadSource) para que se compare en reportes. */
export const FUENTES: { value: string; label: string }[] = [
  { value: "REFERIDO", label: "Referido" },
  { value: "WEB", label: "Web" },
  { value: "REDES_SOCIALES", label: "Redes sociales" },
  { value: "FERIA", label: "Feria" },
  { value: "LLAMADA_FRIA", label: "Llamada en frío" },
  { value: "CORREO", label: "Correo" },
  { value: "OTRO", label: "Otro" },
];

/** «REDES_SOCIALES» → «Redes sociales». Lo que no está en la lista se devuelve tal cual. */
export function etiquetaFuente(v: string | null | undefined): string | null {
  if (!v) return null;
  return FUENTES.find((f) => f.value === v)?.label ?? v;
}

/** Motivos de pérdida más comunes; «Otro» abre un campo libre. */
export const MOTIVOS_PERDIDA = [
  "Precio",
  "Eligió a otro proveedor",
  "No respondió",
  "Lo pospuso",
  "No era lo que necesitaba",
  "Sin presupuesto",
] as const;

const ORDEN_TIPO: Record<string, number> = { abierta: 0, ganada: 1, perdida: 2 };

/** Abiertas primero en su orden; al final Ganado y después Perdido, pase lo que pase con el número de orden. */
export function ordenarEtapas<T extends EtapaBase>(etapas: T[]): T[] {
  return [...etapas].sort((a, b) => (ORDEN_TIPO[a.tipo] ?? 0) - (ORDEN_TIPO[b.tipo] ?? 0) || a.orden - b.orden || a.nombre.localeCompare(b.nombre));
}

/**
 * Sube o baja una etapa abierta un lugar entre las abiertas. Devuelve los nuevos números de orden
 * (0, 1, 2…) de todas las abiertas, o null si ya está en el borde o no es abierta.
 */
export function moverEtapa<T extends EtapaBase>(etapas: T[], id: string, dir: "subir" | "bajar"): { id: string; orden: number }[] | null {
  const abiertas = ordenarEtapas(etapas).filter((e) => e.tipo === "abierta");
  const i = abiertas.findIndex((e) => e.id === id);
  if (i < 0) return null;
  const j = dir === "subir" ? i - 1 : i + 1;
  if (j < 0 || j >= abiertas.length) return null;
  const lista = [...abiertas];
  [lista[i], lista[j]] = [lista[j], lista[i]];
  return lista.map((e, orden) => ({ id: e.id, orden }));
}

/** Probabilidad entre 0 y 100, entera. */
export function probabilidadValida(v: unknown, porDefecto = 10): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(100, Math.max(0, n));
}

const redondear = (n: number) => Math.round(n * 100) / 100;

/** Pronóstico ponderado: suma de valor × probabilidad de las oportunidades abiertas. */
export function pronosticoPonderado(ops: Pick<OportunidadBase, "valor" | "probabilidad" | "estado">[]): number {
  return redondear(ops.filter((o) => o.estado === "abierta").reduce((s, o) => s + (Number(o.valor) || 0) * (probabilidadValida(o.probabilidad, 0) / 100), 0));
}

export type TotalEtapa = { etapaId: string; cantidad: number; valor: number; ponderado: number };

/** Cantidad, valor y pronóstico de cada etapa (incluye las etapas vacías, en cero). */
export function totalesPorEtapa(etapas: Pick<EtapaBase, "id">[], ops: OportunidadBase[]): Record<string, TotalEtapa> {
  const out: Record<string, TotalEtapa> = {};
  for (const e of etapas) out[e.id] = { etapaId: e.id, cantidad: 0, valor: 0, ponderado: 0 };
  for (const o of ops) {
    const t = out[o.etapaId] ?? (out[o.etapaId] = { etapaId: o.etapaId, cantidad: 0, valor: 0, ponderado: 0 });
    const v = Number(o.valor) || 0;
    t.cantidad += 1;
    t.valor = redondear(t.valor + v);
    t.ponderado = redondear(t.ponderado + v * (probabilidadValida(o.probabilidad, 0) / 100));
  }
  return out;
}

/** ¿La fecha cae en el mismo mes (hora de Panamá) que `hoy`? */
export function mismoMes(fecha: Date | string, hoy: Date = new Date()): boolean {
  const f = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Panama" }).slice(0, 7);
  return f(new Date(fecha)) === f(hoy);
}

/** Los tres números de arriba del tablero. */
export function resumenEmbudo(ops: OportunidadBase[], hoy: Date = new Date()) {
  const abiertas = ops.filter((o) => o.estado === "abierta");
  const ganadasMes = ops.filter((o) => o.estado === "ganada" && o.cerradaAt && mismoMes(o.cerradaAt, hoy));
  return {
    totalAbierto: redondear(abiertas.reduce((s, o) => s + (Number(o.valor) || 0), 0)),
    abiertas: abiertas.length,
    ponderado: pronosticoPonderado(abiertas),
    cerradoMes: redondear(ganadasMes.reduce((s, o) => s + (Number(o.valor) || 0), 0)),
    ganadasMes: ganadasMes.length,
  };
}

/** El cierre esperado ya pasó (antes de hoy en Panamá) y la oportunidad sigue abierta. */
export function cierreVencido(cierre: Date | string | null | undefined, estado: string, hoy: Date = new Date()): boolean {
  if (!cierre || estado !== "abierta") return false;
  const dia = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "UTC" });
  const hoyPa = hoy.toLocaleDateString("en-CA", { timeZone: "America/Panama" });
  return dia(new Date(cierre)) < hoyPa;
}

/** Correo comparable: sin espacios y en minúsculas. Vacío → null. */
export function normalizarCorreo(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e && e.includes("@") ? e : null;
}

/**
 * Elige el cliente que ya existe con ese correo (sin importar mayúsculas ni espacios). Si hay varios,
 * prefiere uno sin archivar y, entre esos, el más antiguo. Sin correo no adivina: devuelve null.
 */
export function elegirClientePorCorreo<T extends { id: string; email: string | null; archivedAt?: Date | string | null; createdAt?: Date | string }>(
  clientes: T[],
  email: string | null | undefined,
): T | null {
  const buscado = normalizarCorreo(email);
  if (!buscado) return null;
  const iguales = clientes.filter((c) => normalizarCorreo(c.email) === buscado);
  if (iguales.length === 0) return null;
  return [...iguales].sort(
    (a, b) => Number(!!a.archivedAt) - Number(!!b.archivedAt) || +new Date(a.createdAt ?? 0) - +new Date(b.createdAt ?? 0),
  )[0];
}

/** Línea de cotización (el mismo formato que guarda el armador de cotizaciones). */
export type LineaCotizacion = { description?: string; quantity?: number | string; unitPrice?: number | string; discount?: number | string };

/** Las líneas de una cotización como fases del proyecto: nombre = descripción, precio = cantidad × precio − descuento. */
export function fasesDesdeLineas(lineas: LineaCotizacion[] | null | undefined): { name: string; price: number }[] {
  return (lineas ?? [])
    .map((l) => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unitPrice) || 0;
      const disc = Number(l.discount) || 0;
      return { name: String(l.description ?? "").trim().split("\n")[0].slice(0, 160), price: redondear(qty * price * (1 - disc / 100)) };
    })
    .filter((f) => f.name);
}

/** Texto de la historia de una oportunidad (se guarda como interacción tipo nota en el lead o cliente). */
export const PREFIJO_HISTORIA = "Oportunidad «";
export function textoHistoria(titulo: string, detalle: string): string {
  return `${PREFIJO_HISTORIA}${titulo}»: ${detalle}`;
}

const fmtDinero = new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const fmtCorto = new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
/** «$1,250.00» (sirve en el navegador: no carga la base como `dinero` de portal/datos). */
export const usd = (v: unknown) => fmtDinero.format(Number(v) || 0);
/** «$1,250» para tarjetas y totales. */
export const usdCorto = (v: unknown) => fmtCorto.format(Number(v) || 0);
/** «16 oct 2026». Las fechas de cierre se guardan al mediodía UTC, así que se leen en UTC. */
export const fechaLegible = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
/** «2026-10-16» para un <input type="date">. */
export const fechaInput = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
