/** Reglas puras del Pulso (sin base de datos), para poder probarlas. */
import { createHash } from "node:crypto";

export type EstadoSistema = "sin_senal" | "ok" | "degradado" | "caido";
export const FALLOS_PARA_CAIDO = 2;
/** Un sistema que manda latidos y calla más de esto pasa a «sin señal». */
export const SILENCIO_MAX_MS = 3 * 60 * 60 * 1000;

export const ESTADO_LABEL: Record<EstadoSistema, string> = {
  sin_senal: "Sin señal",
  ok: "En línea",
  degradado: "Con fallas",
  caido: "Caído",
};

/** Lo que ve el cliente: nunca alarma de más ni nombra detalles técnicos. */
export const ESTADO_CLIENTE: Record<EstadoSistema, { texto: string; detalle: string } | null> = {
  sin_senal: null,
  ok: { texto: "En línea", detalle: "Funcionando con normalidad." },
  degradado: { texto: "Funciona con fallas", detalle: "Detectamos un problema y ya lo estamos revisando." },
  caido: { texto: "Con problemas", detalle: "Tu sistema no responde. Pime ya recibió la alerta y está trabajando en ello." },
};

/** Resultado de un sondeo de salud: dos fallos seguidos lo marcan caído (uno solo puede ser un tropiezo de red). */
export function trasSondeo(prev: { status: string; failCount: number }, ok: boolean): { status: EstadoSistema; failCount: number } {
  if (ok) return { status: prev.status === "degradado" ? "degradado" : "ok", failCount: 0 };
  const failCount = prev.failCount + 1;
  if (failCount >= FALLOS_PARA_CAIDO) return { status: "caido", failCount };
  return { status: (prev.status as EstadoSistema) ?? "sin_senal", failCount };
}

export type Alerta = "caido" | "recuperado" | "degradado" | null;

/**
 * Qué alerta toca al cambiar de estado, según lo último que se avisó. Así un sistema caído
 * avisa una sola vez y avisa otra cuando vuelve.
 */
export function alertaPorCambio(alertado: string | null, nuevo: EstadoSistema): Alerta {
  if (nuevo === "caido") return alertado === "caido" ? null : "caido";
  if (nuevo === "degradado") return alertado === "degradado" ? null : "degradado";
  if (nuevo === "ok") return alertado === "caido" || alertado === "degradado" ? "recuperado" : null;
  return null;
}

/** Huella de un error: el mismo problema con distintos ids o números cae en la misma fila. */
export function huellaDeError(mensaje: string, lugar?: string | null): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<id>")
      .replace(/\b[0-9a-z]{20,}\b/g, "<id>")
      .replace(/\d+/g, "<n>")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
  return createHash("sha256").update(`${norm(mensaje)}|${norm(lugar ?? "")}`).digest("hex").slice(0, 24);
}

export function nivelDe(x: unknown): "aviso" | "error" | "grave" {
  return x === "aviso" || x === "warning" ? "aviso" : x === "grave" || x === "fatal" || x === "critical" ? "grave" : "error";
}

/** key del sistema a partir del nombre: minúsculas, guiones y un sufijo corto para que no choque. */
export function keyDesdeNombre(nombre: string, sufijo: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "sistema"}-${sufijo}`;
}
