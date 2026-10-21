/**
 * Lo de las respuestas a leads que no toca la base: lo usan el servidor y la pantalla (src/lib/leads/respuestas.ts
 * tiene el resto).
 */

export type EstadoRespuesta = "borrador" | "enviada" | "descartada" | "fallo";

/** Una tanda por corrida del agente. La hora (UTC) basta: corre una vez al día. */
export function loteDeAhora(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `agente-${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}`;
}

export function archivoPropuesta(empresa: string, idioma: string): string {
  const base = empresa
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    .slice(0, 60) || "Prospecto";
  return `${idioma === "en" ? "Proposal" : "Propuesta"}_Pime_${base}.pdf`;
}

/** Lo que la vista necesita de cada respuesta. Fechas en ISO: cruza al navegador. */
export type RespuestaVista = {
  id: string;
  lote: string;
  idioma: string;
  para: string | null;
  asunto: string;
  cuerpo: string;
  mensajeLinkedin: string | null;
  linkedinUrl: string | null;
  adjuntarPdf: boolean;
  estado: EstadoRespuesta;
  error: string | null;
  enviadaAt: string | null;
  correoId: string | null;
  linkedinAt: string | null;
  tienePropuesta: boolean;
  createdAt: string;
  lead: { id: string; name: string; company: string | null; status: string; priority: string; sitio: string | null };
};

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Por qué una respuesta no se puede enviar todavía, o null si está lista. */
export function faltaParaEnviar(r: Pick<RespuestaVista, "para" | "asunto" | "cuerpo" | "estado">): string | null {
  if (r.estado === "enviada") return "Ya se envió.";
  if (r.estado === "descartada") return "Está descartada.";
  if (!r.para || !CORREO_RE.test(r.para.trim())) return "Falta el correo del destinatario.";
  if (!r.asunto.trim()) return "Falta el asunto.";
  if (!r.cuerpo.trim()) return "Falta el texto del correo.";
  return null;
}

