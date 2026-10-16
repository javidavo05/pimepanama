/**
 * Filtros de la lista de clientes (fase 6 del CRM), puros: leerlos de la dirección, volver a escribirlos sin perder
 * ninguno, decidir si un cliente pasa y paginar. La página, las vistas guardadas y la exportación usan los mismos.
 */

export const FILTROS_RAPIDOS = [
  { id: "", label: "Todos" },
  { id: "mios", label: "Mis clientes" },
  { id: "saldo", label: "Con saldo" },
  { id: "tickets", label: "Tickets abiertos" },
  { id: "proyectos", label: "Proyectos en curso" },
  { id: "premium", label: "Premium" },
] as const;
export const ORDENES = [
  { id: "", label: "Recientes" },
  { id: "az", label: "A–Z" },
  { id: "saldo", label: "Mayor saldo" },
  { id: "contacto", label: "Más tiempo sin contacto" },
] as const;
export const SIN_CONTACTO = [
  { id: "", label: "Cualquier fecha" },
  { id: "30", label: "Más de 30 días sin contacto" },
  { id: "60", label: "Más de 60 días sin contacto" },
  { id: "90", label: "Más de 90 días sin contacto" },
] as const;

export type FiltroRapido = (typeof FILTROS_RAPIDOS)[number]["id"];
export type Orden = (typeof ORDENES)[number]["id"];
export type SinContacto = (typeof SIN_CONTACTO)[number]["id"];

export type Filtros = {
  q: string; filtro: FiltroRapido; orden: Orden;
  etiqueta: string; fuente: string; industria: string;
  /** "" cualquiera · "sin" sin responsable · id de un miembro */
  responsable: string;
  contacto: SinContacto;
  pagina: number;
};

/** Claves que van en la dirección y en una vista guardada (la página no se guarda). */
export const CLAVES_FILTRO = ["q", "filtro", "orden", "etiqueta", "fuente", "industria", "responsable", "contacto"] as const;
export const POR_PAGINA = 50;

const uno = <T extends readonly { id: string }[]>(lista: T, v: unknown): T[number]["id"] =>
  (lista.some((x) => x.id === v) ? v : "") as T[number]["id"];
const texto = (v: unknown, max = 80): string => (typeof v === "string" ? v.trim().slice(0, max) : Array.isArray(v) ? texto(v[0], max) : "");

/** De la dirección (o de una vista guardada) a filtros válidos; lo desconocido se ignora. */
export function leerFiltros(sp: Record<string, unknown>): Filtros {
  const pagina = Math.max(1, Math.min(10_000, Number.parseInt(texto(sp.pagina, 6), 10) || 1));
  return {
    q: texto(sp.q, 120),
    filtro: uno(FILTROS_RAPIDOS, texto(sp.filtro)),
    orden: uno(ORDENES, texto(sp.orden)),
    etiqueta: texto(sp.etiqueta, 40),
    fuente: texto(sp.fuente, 60),
    industria: texto(sp.industria, 60),
    responsable: texto(sp.responsable, 40),
    contacto: uno(SIN_CONTACTO, texto(sp.contacto)),
    pagina,
  };
}

/** Filtros → query string, con cambios. Cambiar un filtro vuelve a la página 1. */
export function aQuery(f: Filtros, cambio: Partial<Filtros> = {}): string {
  const n = { ...f, ...cambio };
  if (Object.keys(cambio).some((k) => k !== "pagina")) n.pagina = cambio.pagina ?? 1;
  const p = new URLSearchParams();
  for (const k of CLAVES_FILTRO) if (n[k]) p.set(k, String(n[k]));
  if (n.pagina > 1) p.set("pagina", String(n.pagina));
  return p.toString();
}

/** Solo los filtros (sin página) como objeto, para guardar una vista. */
export function filtrosGuardables(f: Filtros): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of CLAVES_FILTRO) if (f[k]) o[k] = String(f[k]);
  return o;
}

/** ¿Hay algo filtrado? (para el estado vacío y el «Quitar filtros»). */
export const hayFiltros = (f: Filtros) => CLAVES_FILTRO.some((k) => k !== "orden" && !!f[k]);

const DIA = 86_400_000;
/** Días completos desde el último contacto; null si nunca hubo. */
export function diasDesde(ms: number | null | undefined, ahora = Date.now()): number | null {
  if (!ms) return null;
  return Math.max(0, Math.floor((ahora - ms) / DIA));
}

/** «Hoy», «Ayer», «Hace 12 días», «Hace 3 meses», «Sin contacto». */
export function haceCuanto(ms: number | null | undefined, ahora = Date.now()): string {
  const d = diasDesde(ms, ahora);
  if (d == null) return "Sin contacto";
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  if (d < 60) return `Hace ${d} días`;
  if (d < 730) return `Hace ${Math.floor(d / 30)} meses`;
  return `Hace ${Math.floor(d / 365)} años`;
}

export type FilaFiltrable = {
  internal: boolean; brandLine: string; responsableId: string | null;
  etiquetas: string[]; fuente: string | null; industria: string | null;
  saldo: number; tickets: number; proyectos: number;
  /** Último contacto en ms (contacto anotado o último movimiento), 0 si nunca. */
  contacto: number;
};

/** ¿El cliente pasa todos los filtros? `miembro` es quien mira (para «Mis clientes»). */
export function pasaFiltros(c: FilaFiltrable, f: Filtros, miembro: { id: string; esDueno: boolean }, ahora = Date.now()): boolean {
  const igual = (a: string | null, b: string) => (a ?? "").toLocaleLowerCase("es") === b.toLocaleLowerCase("es");
  // «Mis clientes»: los que tengo a cargo (el dueño, también los que no tienen responsable).
  if (f.filtro === "mios" && !(c.responsableId === miembro.id || (miembro.esDueno && !c.responsableId))) return false;
  if (f.filtro === "saldo" && !(!c.internal && c.saldo > 0)) return false;
  if (f.filtro === "tickets" && !(c.tickets > 0)) return false;
  if (f.filtro === "proyectos" && !(c.proyectos > 0)) return false;
  if (f.filtro === "premium" && !(!c.internal && c.brandLine === "premium")) return false;
  if (f.etiqueta && !c.etiquetas.some((e) => igual(e, f.etiqueta))) return false;
  if (f.fuente && !igual(c.fuente, f.fuente)) return false;
  if (f.industria && !igual(c.industria, f.industria)) return false;
  if (f.responsable === "sin" ? !!c.responsableId : f.responsable && c.responsableId !== f.responsable) return false;
  if (f.contacto) {
    const d = diasDesde(c.contacto, ahora);
    if (d != null && d <= Number(f.contacto)) return false;
  }
  return true;
}

/** Una página de la lista, con el total de páginas (la pedida se ajusta si se pasa). */
export function paginar<T>(filas: T[], pagina: number, tam = POR_PAGINA) {
  const paginas = Math.max(1, Math.ceil(filas.length / tam));
  const actual = Math.min(Math.max(1, pagina), paginas);
  const desde = (actual - 1) * tam;
  return { items: filas.slice(desde, desde + tam), pagina: actual, paginas, total: filas.length, desde: filas.length ? desde + 1 : 0, hasta: Math.min(desde + tam, filas.length) };
}

/** Valores distintos (sin repetir mayúsculas), ordenados, para los selectores de filtro. */
export function opcionesDe(valores: (string | null | undefined)[]): string[] {
  const m = new Map<string, string>();
  for (const v of valores) { const t = v?.trim(); if (t && !m.has(t.toLocaleLowerCase("es"))) m.set(t.toLocaleLowerCase("es"), t); }
  return [...m.values()].sort((a, b) => a.localeCompare(b, "es"));
}
