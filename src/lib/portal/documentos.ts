/**
 * Reglas puras de los documentos de la cuenta del cliente: qué propuestas ve, quién puede aceptarlas, cómo se
 * lee el estado de un contrato, qué reuniones comparte Pime y qué archivos se pueden subir. Sin base de datos:
 * las consultas viven en datos.ts y las acciones en (privado)/acciones-documentos.ts.
 */
import type { Tono } from "@/components/portal/ui";

// ─── Propuestas (Document tipo COTIZACION) ───────────────────────────────────

/** Solo lo que Pime ya envió: los borradores, rechazadas o canceladas no salen al cliente. */
export const PROPUESTA_VISIBLE = ["SENT", "ACCEPTED"] as const;
export const propuestaVisible = (status: string) => (PROPUESTA_VISIBLE as readonly string[]).includes(status);

export type Rol = "principal" | "miembro" | string;

/** Si esta persona puede aceptar esta propuesta, y si no, por qué (en palabras para el cliente). */
export function puedeAceptarPropuesta(p: { status: string; validUntil?: Date | null }, rol: Rol, ahora: Date = new Date()): { ok: true } | { ok: false; motivo: string } {
  if (p.status === "ACCEPTED") return { ok: false, motivo: "Esta propuesta ya está aceptada." };
  if (p.status !== "SENT") return { ok: false, motivo: "Esta propuesta ya no espera tu respuesta." };
  if (rol !== "principal") return { ok: false, motivo: "Solo la persona principal de la cuenta puede aceptar propuestas. Pídele que entre a aceptarla." };
  if (p.validUntil && finDelDia(p.validUntil).getTime() < ahora.getTime()) return { ok: false, motivo: "Esta propuesta venció. Escríbenos y te la actualizamos." };
  return { ok: true };
}

/** La validez cubre el día completo en Panamá (UTC-5): una propuesta «válida hasta el 20» sirve todo el 20. */
function finDelDia(d: Date): Date {
  const panama = new Date(d.getTime() - 5 * 3_600_000);
  return new Date(Date.UTC(panama.getUTCFullYear(), panama.getUTCMonth(), panama.getUTCDate(), 23 + 5, 59, 59, 999));
}

export function estadoPropuesta(p: { status: string; validUntil?: Date | null }, ahora: Date = new Date()): { texto: string; tono: Tono } {
  if (p.status === "ACCEPTED") return { texto: "Aceptada", tono: "ok" };
  if (p.validUntil && finDelDia(p.validUntil).getTime() < ahora.getTime()) return { texto: "Vencida", tono: "neutro" };
  return { texto: "Espera tu respuesta", tono: "aviso" };
}

/** Quién aceptó, para guardar en Document.aceptadaPor: el nombre si lo tiene, si no el correo. */
export const nombreQueAcepta = (persona: { fullName?: string | null; email: string }) => (persona.fullName?.trim() || persona.email).slice(0, 160);

export type LineaPropuesta = { descripcion: string; cantidad: number; precio: number; total: number };
/** Líneas de la cotización (content.lineItems), con la misma cuenta que el PDF. Ignora lo que no tenga forma. */
export function lineasDePropuesta(content: unknown): LineaPropuesta[] {
  const items = (content as { lineItems?: unknown } | null)?.lineItems;
  if (!Array.isArray(items)) return [];
  return items
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && typeof (x as { description?: unknown }).description === "string")
    .map((x) => {
      const cantidad = Number(x.quantity) || 0, precio = Number(x.unitPrice) || 0, desc = Number(x.discount) || 0, imp = Number(x.taxPercent) || 0;
      const base = cantidad * precio * (1 - desc / 100);
      return { descripcion: String(x.description), cantidad, precio, total: base + base * (imp / 100) };
    })
    .filter((x) => x.descripcion.trim());
}

// ─── Contratos ───────────────────────────────────────────────────────────────

export type ContratoEstado = { status: string; signingStatus?: string | null; signedPdf?: boolean; clientEmail?: string | null };

/** Un borrador que nunca salió a firma es trabajo interno; el resto el cliente lo ve. */
export const contratoVisible = (c: ContratoEstado) => c.status !== "DRAFT" || (!!c.signingStatus && c.signingStatus !== "DRAFT");

export function estadoContrato(c: ContratoEstado): { texto: string; tono: Tono } {
  switch (c.signingStatus) {
    case "PENDING_CLIENT": return { texto: "Espera tu firma", tono: "aviso" };
    case "PENDING_COMPANY": return { texto: "Firmaste · falta Pime", tono: "marca" };
    case "COMPLETED": return { texto: "Firmado", tono: "ok" };
    case "DECLINED": return { texto: "Firma rechazada", tono: "peligro" };
    case "EXPIRED": return { texto: "El enlace de firma venció", tono: "neutro" };
  }
  if (c.status === "ACTIVE") return { texto: "Vigente", tono: "ok" };
  if (c.status === "EXPIRED") return { texto: "Terminó su vigencia", tono: "neutro" };
  if (c.status === "TERMINATED") return { texto: "Terminado", tono: "neutro" };
  return { texto: "En preparación", tono: "neutro" };
}

/** El contrato espera la firma de esta persona: la firma la hace a quien Pime se la mandó, no cualquiera de la cuenta. */
export const esperaMiFirma = (c: ContratoEstado, email: string) =>
  c.signingStatus === "PENDING_CLIENT" && !!c.clientEmail && c.clientEmail.trim().toLowerCase() === email.trim().toLowerCase();

// ─── Minutas ─────────────────────────────────────────────────────────────────

export type MinutaCliente = { agenda: string; decisiones: string[]; compromisos: string[]; riesgos: string[]; proximosPasos: string; proximaReunion: string };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const lista = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/**
 * Lo que el cliente ve de una reunión: solo la minuta ejecutiva (Meeting.executiveMinutes). La técnica, el
 * prompt y la transcripción nunca pasan por aquí. Devuelve null si no hay nada que mostrar.
 */
export function minutaParaCliente(raw: unknown): MinutaCliente | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const m: MinutaCliente = { agenda: str(r.agenda), decisiones: lista(r.decisions), compromisos: lista(r.commitments), riesgos: lista(r.risks), proximosPasos: str(r.nextSteps), proximaReunion: str(r.nextMeeting) };
  const vacia = !m.agenda && !m.decisiones.length && !m.compromisos.length && !m.riesgos.length && !m.proximosPasos;
  return vacia ? null : m;
}

// ─── Archivos ────────────────────────────────────────────────────────────────

export const MAX_ARCHIVO = 20 * 1024 * 1024;
/** Lo que no se acepta: ejecutables y scripts. Todo lo demás (documentos, hojas, imágenes, ZIP) sí. */
const PROHIBIDAS = /\.(exe|msi|bat|cmd|com|scr|ps1|vbs|js|jar|sh|app|dmg|apk|html?|svg)$/i;

export function archivoValido(a: { nombre: string; tamano: number }): string | null {
  if (!a.nombre.trim()) return "El archivo no tiene nombre.";
  if (!Number.isFinite(a.tamano) || a.tamano <= 0) return "El archivo está vacío.";
  if (a.tamano > MAX_ARCHIVO) return "El archivo pasa de 20 MB. Comprímelo o divídelo en partes.";
  if (PROHIBIDAS.test(a.nombre.trim())) return "Ese tipo de archivo no se puede subir por seguridad. Comprímelo en un ZIP si lo necesitas.";
  return null;
}

/** Carpeta de los archivos compartidos de un cliente en R2. El registro solo acepta llaves de esta carpeta. */
export const carpetaArchivos = (clientId: string) => `archivos/${clientId}/`;
export const llaveDeArchivos = (clientId: string, key: string) => key.startsWith(carpetaArchivos(clientId)) && !key.includes("..");

export function nombreSeguro(nombre: string): string {
  return nombre.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(-100) || "archivo";
}

export function tamanoLegible(bytes: number | null | undefined): string {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b <= 0) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toLocaleString("es-PA", { maximumFractionDigits: 1 })} MB`;
}

/** Quién subió el archivo, visto desde la cuenta del cliente. */
export const subidoPorTexto = (subidoPor: string) => (subidoPor === "cliente" ? "Tu equipo" : "Pime");
