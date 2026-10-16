/** Reglas puras de la ficha 360 del cliente (CRM fase 1): contactos, fuente, etiquetas y campos propios. */

export const ROLES_CONTACTO = ["decide", "paga", "tecnico", "otro"] as const;
export type RolContacto = (typeof ROLES_CONTACTO)[number];
export const ROL_CONTACTO_LABEL: Record<RolContacto, string> = { decide: "Decide", paga: "Paga", tecnico: "Técnico", otro: "Otro" };

export const FUENTES_CLIENTE = ["Referido", "Web", "Redes sociales", "Feria", "Llamada en frío", "Otro"] as const;

export const INDUSTRIAS_SUGERIDAS = [
  "Comercio", "Construcción", "Educación", "Finanzas", "Gobierno", "Hotelería y turismo", "Inmobiliaria", "Legal",
  "Logística", "Manufactura", "Restaurantes", "Salud", "Servicios profesionales", "Tecnología", "Transporte",
];

export const TIPOS_CAMPO = ["texto", "numero", "fecha", "opcion"] as const;
export type TipoCampo = (typeof TIPOS_CAMPO)[number];
export const TIPO_CAMPO_LABEL: Record<TipoCampo, string> = { texto: "Texto", numero: "Número", fecha: "Fecha", opcion: "Opción de una lista" };

/**
 * Número para wa.me: solo dígitos. Un número panameño de 7 u 8 dígitos (sin código de país) lleva 507 delante.
 * Devuelve null si no queda un número usable.
 */
export function numeroWhatsapp(telefono: string | null | undefined): string | null {
  let d = String(telefono ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 7 || d.length === 8) d = `507${d}`;
  return d.length >= 8 && d.length <= 15 ? d : null;
}

/** Etiquetas limpias: sin espacios de más, sin repetidas (sin importar mayúsculas), máximo 20 de 40 letras. */
export function limpiarEtiquetas(v: readonly unknown[]): string[] {
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const x of v) {
    const t = String(x ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!t || vistas.has(t.toLowerCase())) continue;
    vistas.add(t.toLowerCase());
    out.push(t);
    if (out.length >= 20) break;
  }
  return out;
}

/** «Fecha de aniversario» → «fecha_de_aniversario»: la clave estable de un campo propio. */
export function claveDeCampo(etiqueta: string): string {
  return etiqueta
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    .slice(0, 40) || "campo";
}

/** Valor de un campo propio según su tipo; null = vacío o no válido (no se guarda). */
export function valorDeCampo(tipo: string, opciones: readonly string[], crudo: string): string | number | null {
  const v = crudo.trim();
  if (!v) return null;
  if (tipo === "numero") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (tipo === "fecha") return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  if (tipo === "opcion") return opciones.includes(v) ? v : null;
  return v.slice(0, 500);
}
