/**
 * Correos ligados al lead o al cliente (migración 0062), la parte pura.
 *
 * Cada correo que entra o sale queda colgado de quien corresponde, en este orden:
 *   1. la dirección de la contraparte es la de un cliente o de uno de sus contactos → el cliente;
 *   2. es la de un lead → el lead (y su cliente si ya se ganó);
 *   3. el hilo ya estaba ligado (mismo hilo, responde a un correo ligado, o la dirección se ligó a mano) → lo mismo;
 *   4. nadie lo conoce y la IA vio una solicitud de cotización → se crea el lead.
 * Lo ligado a mano ('manual') o descartado ('ignorado') no se vuelve a tocar.
 *
 * Sin base: se prueba en vinculo-correo.test.ts. La carga y la escritura están en vinculo-correo-datos.ts.
 */
import { extractEmailAddress } from "@/lib/mail/thread";

/** Buzones que mandan solos: nunca son un cliente ni un lead. */
const AUTOMATICO = /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounces?|notifications?|notificaciones|alertas?|alerts?|news(letter)?|marketing|mailer|soporte-automatico|info-noreply)([+._-]|@)/i;
const DOMINIO_AUTOMATICO = /(^|\.)(amazonses\.com|sendgrid\.net|mailchimp\.com|mcsv\.net|hubspotemail\.net|substack\.com|linkedin\.com|facebookmail\.com|google\.com|github\.com|vercel\.com|stripe\.com|paypal\.com)$/i;

export function dominioDe(direccion: string): string | null {
  const at = direccion.lastIndexOf("@");
  return at > 0 ? direccion.slice(at + 1).toLowerCase() : null;
}

export function esBuzonAutomatico(direccion: string): boolean {
  const d = extractEmailAddress(direccion);
  const dominio = dominioDe(d);
  return AUTOMATICO.test(d) || (!!dominio && DOMINIO_AUTOMATICO.test(dominio));
}

/**
 * Con quién es la conversación: en lo recibido, quien escribe; en lo enviado, a quién (para y copia).
 * Sin las direcciones propias ni las de los dominios propios (un correo entre el equipo no es de un cliente).
 */
export function contrapartes(
  correo: { folder: string; fromEmail: string; toAddresses: string[]; ccAddresses: string[] },
  propias: { direcciones: ReadonlySet<string>; dominios: ReadonlySet<string> },
): string[] {
  const ajena = (d: string) => !!d && d.includes("@") && !propias.direcciones.has(d) && !propias.dominios.has(dominioDe(d) ?? "");
  const de = extractEmailAddress(correo.fromEmail);
  const lista = correo.folder === "SENT" || !ajena(de) ? [...correo.toAddresses, ...correo.ccAddresses].map(extractEmailAddress) : [de];
  return [...new Set(lista.filter(ajena))];
}

/** Dominios propios: los de los buzones conectados, salvo los de correo gratuito (gmail, hotmail…). */
const GRATUITOS = new Set(["gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com"]);
export function dominiosPropios(direcciones: Iterable<string>): Set<string> {
  const s = new Set<string>();
  for (const d of direcciones) {
    const dom = dominioDe(d);
    if (dom && !GRATUITOS.has(dom)) s.add(dom);
  }
  return s;
}

export type Coincidencias = {
  clientId: string | null;
  lead: { id: string; convertedClientId: string | null } | null;
  hilo: { leadId: string | null; clientId: string | null } | null;
};

export type Decision =
  | { tipo: "ligar"; leadId: string | null; clientId: string | null; por: "cliente" | "lead" | "hilo" }
  | { tipo: "crear-lead" }
  | { tipo: "nada" };

/**
 * Qué hacer con un correo. `puedeCrear` = es recibido, de una persona (no de un buzón automático), no es spam y
 * la IA vio una solicitud de cotización.
 */
export function decidir(c: Coincidencias, puedeCrear: boolean): Decision {
  if (c.clientId) {
    // El lead que ya es este cliente también queda ligado: su historia previa sigue junta.
    const leadId = c.lead && c.lead.convertedClientId === c.clientId ? c.lead.id : null;
    return { tipo: "ligar", clientId: c.clientId, leadId, por: "cliente" };
  }
  if (c.lead) return { tipo: "ligar", leadId: c.lead.id, clientId: c.lead.convertedClientId, por: "lead" };
  if (c.hilo && (c.hilo.leadId || c.hilo.clientId)) return { tipo: "ligar", leadId: c.hilo.leadId, clientId: c.hilo.clientId, por: "hilo" };
  return puedeCrear ? { tipo: "crear-lead" } : { tipo: "nada" };
}

/** Message-IDs a los que responde un correo (In-Reply-To y References). */
export function idsReferidos(correo: { inReplyTo: string | null; referencesHeader: string | null }): string[] {
  const ids = [correo.inReplyTo ?? "", ...(correo.referencesHeader ?? "").split(/\s+/)].map((s) => s.trim()).filter(Boolean);
  return [...new Set(ids)].slice(-20);
}

/** Nombre del lead que nace de un correo: el que dio la IA, el del remitente, o la parte antes de la @. */
export function nombreDelRemitente(iaNombre: string | null | undefined, fromName: string | null | undefined, direccion: string): string {
  const limpio = (s: string | null | undefined) => (s ?? "").replace(/["']/g, "").trim();
  const n = limpio(iaNombre) || limpio(fromName);
  if (n && !n.includes("@")) return n.slice(0, 120);
  const usuario = direccion.split("@")[0] ?? direccion;
  return usuario.replace(/[._-]+/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).trim().slice(0, 120) || direccion;
}

/** Nota con la que nace el lead: de dónde vino y qué pidió. */
export function notaDeSolicitud(p: { fecha: Date; buzon: string; asunto: string | null; necesidad: string; cuerpo: string }): string {
  const fecha = p.fecha.toLocaleString("es-PA", { timeZone: "America/Panama" });
  const cuerpo = p.cuerpo.replace(/\s+\n/g, "\n").trim().slice(0, 2000);
  return `[${fecha}] Correo a ${p.buzon}${p.asunto ? ` — «${p.asunto.trim()}»` : ""}\nPide: ${p.necesidad}${cuerpo ? `\n\n${cuerpo}` : ""}`;
}
