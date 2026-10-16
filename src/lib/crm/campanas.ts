/**
 * Segmento de una campaña: qué clientes entran según los filtros y a qué correo le llega a cada uno.
 * Puro: lo usa la página (conteo en vivo) y el envío (que vuelve a calcularlo en el servidor).
 *
 * Reglas: nunca a clientes internos ni archivados, nunca a un correo dado de baja, un correo una sola vez.
 * El destinatario es el contacto principal con correo del cliente; si no tiene, el correo del cliente.
 */

export type FiltroCampana = {
  /** El cliente tiene al menos una de estas etiquetas. Vacío = todas. */
  etiquetas: string[];
  fuente: string;
  industria: string;
  responsableId: string;
  linea: "" | "normal" | "premium";
  proyecto: "" | "si" | "no";
};

export const FILTRO_VACIO: FiltroCampana = { etiquetas: [], fuente: "", industria: "", responsableId: "", linea: "", proyecto: "" };

export type ClienteSegmento = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  brandLine: string;
  fuente: string | null;
  industria: string | null;
  etiquetas: string[];
  responsableId: string | null;
  internal: boolean;
  archivedAt: Date | string | null;
  proyectoActivo: boolean;
  /** Contactos con su marca de principal (solo hacen falta los principales). */
  contactos: { nombre: string; email: string | null; principal: boolean }[];
};

export type Destinatario = { clientId: string; email: string; nombre: string; empresa: string };

const str = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Lo que viene de un formulario o de `Campana.filtro` (Json) → filtro válido. */
export function normalizarFiltro(x: unknown): FiltroCampana {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const linea = str(o.linea);
  const proyecto = str(o.proyecto);
  return {
    etiquetas: Array.isArray(o.etiquetas) ? [...new Set(o.etiquetas.map((e) => str(e, 60)).filter(Boolean))].slice(0, 30) : [],
    fuente: str(o.fuente),
    industria: str(o.industria),
    responsableId: str(o.responsableId),
    linea: linea === "normal" || linea === "premium" ? linea : "",
    proyecto: proyecto === "si" || proyecto === "no" ? proyecto : "",
  };
}

export function cumpleFiltro(c: ClienteSegmento, f: FiltroCampana): boolean {
  if (c.internal || c.archivedAt) return false;
  if (f.etiquetas.length && !c.etiquetas.some((e) => f.etiquetas.includes(e))) return false;
  if (f.fuente && c.fuente !== f.fuente) return false;
  if (f.industria && c.industria !== f.industria) return false;
  if (f.responsableId && c.responsableId !== f.responsableId) return false;
  if (f.linea && (c.brandLine === "premium" ? "premium" : "normal") !== f.linea) return false;
  if (f.proyecto === "si" && !c.proyectoActivo) return false;
  if (f.proyecto === "no" && c.proyectoActivo) return false;
  return true;
}

const correoValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export type Segmento = {
  destinatarios: Destinatario[];
  /** Cuántos quedaron fuera y por qué (para explicarlo en pantalla). */
  fuera: { bajas: number; sinCorreo: number; duplicados: number };
};

export function elegirDestinatarios(clientes: ClienteSegmento[], filtro: FiltroCampana, bajas: Iterable<string>): Segmento {
  const deBaja = new Set([...bajas].map((e) => e.trim().toLowerCase()));
  const vistos = new Set<string>();
  const destinatarios: Destinatario[] = [];
  const fuera = { bajas: 0, sinCorreo: 0, duplicados: 0 };
  for (const c of clientes) {
    if (!cumpleFiltro(c, filtro)) continue;
    const principal = c.contactos.find((k) => k.principal && k.email && correoValido(k.email.trim()));
    const email = (principal?.email ?? c.email ?? "").trim().toLowerCase();
    if (!email || !correoValido(email)) { fuera.sinCorreo++; continue; }
    if (deBaja.has(email)) { fuera.bajas++; continue; }
    if (vistos.has(email)) { fuera.duplicados++; continue; }
    vistos.add(email);
    destinatarios.push({ clientId: c.id, email, nombre: (principal?.nombre ?? c.name).trim(), empresa: (c.company || c.name).trim() });
  }
  return { destinatarios, fuera };
}

/** Cuántos correos salen por clic: Vercel corta la función a los 300 s y Resend acepta pocos por segundo. */
export const LOTE_POR_CLIC = 150;
/** Tiempo de trabajo por clic antes de parar y pedir «Continuar envío». */
export const TIEMPO_POR_CLIC_MS = 230_000;
