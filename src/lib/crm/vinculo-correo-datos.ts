/**
 * Correos ligados al lead o al cliente (migración 0062): carga y escritura. Las reglas están en vinculo-correo.ts.
 *
 * `vincularCorreo` lo llaman el sync de IMAP (recibidos y enviados) y el envío desde el panel, justo después de
 * guardar el correo. Liga solo a lo que ya existe; una solicitud de alguien nuevo queda como sugerencia
 * (InboxEmail.solicitud) y el lead se crea cuando el equipo la aprueba (pedido de Javier, 2026-10-20). Nunca lanza: si algo falla, el correo ya está guardado y se liga en la siguiente pasada
 * (o a mano desde el correo).
 */
import type { InboxEmail, Lead, LeadPriority, Prisma as PrismaNs } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications/notify";
import { htmlToPlainText, isHtmlEmail } from "@/lib/mail/email-html";
import { extractEmailAddress } from "@/lib/mail/thread";
import type { SolicitudCotizacion } from "@/lib/mail/ai-analyze";
import { isContactFormEmail, parseContactEmail } from "@/lib/leads/contact-email";
import { persistLead } from "@/lib/leads/persist";
import {
  contrapartes, decidir, dominiosPropios, esBuzonAutomatico, idsReferidos, nombreDelRemitente, notaDeSolicitud,
  type Coincidencias,
} from "./vinculo-correo";

type Propias = { direcciones: Set<string>; dominios: Set<string> };
const cachePropias = new Map<string, { at: number; valor: Propias }>();

/** Direcciones y dominios propios del equipo (buzones conectados y correos del equipo). Cinco minutos en memoria. */
export async function direccionesPropias(userId: string): Promise<Propias> {
  const hit = cachePropias.get(userId);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.valor;
  const [buzones, equipo] = await Promise.all([
    prisma.mailAccount.findMany({ where: { userId }, select: { username: true } }),
    prisma.empresaUser.findMany({ where: { OR: [{ id: userId }, { ownerId: userId }] }, select: { email: true } }),
  ]);
  const direcciones = new Set([...buzones.map((b) => b.username), ...equipo.map((e) => e.email)].map(extractEmailAddress).filter(Boolean));
  const valor = { direcciones, dominios: dominiosPropios(buzones.map((b) => extractEmailAddress(b.username))) };
  cachePropias.set(userId, { at: Date.now(), valor });
  return valor;
}

/** Cliente, lead y vínculo del hilo para unas direcciones, en una sola consulta. */
async function buscarCoincidencias(correo: InboxEmail, direcciones: string[]): Promise<Coincidencias> {
  const refs = idsReferidos(correo);
  const filas = await prisma.$queryRaw<{ cliente: string | null; lead: string | null; leadCliente: string | null; hiloLead: string | null; hiloCliente: string | null }[]>(Prisma.sql`
    WITH dirs AS (SELECT unnest(${direcciones}::text[]) AS e),
    l AS (
      SELECT id, "convertedClientId" FROM "Lead"
      WHERE "userId" = ${correo.userId} AND lower(trim(email)) IN (SELECT e FROM dirs)
      ORDER BY "updatedAt" DESC LIMIT 1
    )
    SELECT
      coalesce(
        (SELECT c.id FROM "Client" c WHERE c."userId" = ${correo.userId} AND NOT c.internal AND lower(trim(c.email)) IN (SELECT e FROM dirs)
           ORDER BY (c."archivedAt" IS NULL) DESC, c."updatedAt" DESC LIMIT 1),
        (SELECT k."clientId" FROM "Contacto" k WHERE k."userId" = ${correo.userId} AND lower(trim(k.email)) IN (SELECT e FROM dirs)
           ORDER BY k.principal DESC, k."updatedAt" DESC LIMIT 1)
      ) AS cliente,
      (SELECT id FROM l) AS lead,
      (SELECT "convertedClientId" FROM l) AS "leadCliente",
      h."leadId" AS "hiloLead", h."clientId" AS "hiloCliente"
    FROM (SELECT 1) uno
    LEFT JOIN LATERAL (
      SELECT m."leadId", m."clientId" FROM "InboxEmail" m
      WHERE m."userId" = ${correo.userId} AND m.id <> ${correo.id}
        AND (m."leadId" IS NOT NULL OR m."clientId" IS NOT NULL)
        AND (
          (${correo.threadKey}::text IS NOT NULL AND m."threadKey" = ${correo.threadKey})
          OR (cardinality(${refs}::text[]) > 0 AND m."messageId" = ANY(${refs}::text[]))
          OR (m.vinculo = 'manual' AND (
                lower(m."fromEmail") IN (SELECT e FROM dirs)
                OR EXISTS (SELECT 1 FROM unnest(m."toAddresses") t(d) WHERE lower(trim(t.d)) IN (SELECT e FROM dirs))))
        )
      ORDER BY (m.vinculo = 'manual') DESC, m."receivedAt" DESC LIMIT 1
    ) h ON true`);
  const f = filas[0];
  if (!f) return { clientId: null, lead: null, hilo: null };
  return {
    clientId: f.cliente,
    lead: f.lead ? { id: f.lead, convertedClientId: f.leadCliente } : null,
    hilo: f.hiloLead || f.hiloCliente ? { leadId: f.hiloLead, clientId: f.hiloCliente } : null,
  };
}

function cuerpoPlano(body: string | null): string {
  const b = body ?? "";
  return isHtmlEmail(b) ? htmlToPlainText(b) : b;
}

export type OpcionesVinculo = {
  /** Lo que sacó la IA del correo; sin esto no se crea ningún lead nuevo. */
  solicitud?: SolicitudCotizacion | null;
  /** Etiquetas de la IA: lo marcado spam nunca crea un lead. */
  etiquetas?: string[];
  /** Si el correo trae List-Unsubscribe (boletín o envío masivo). */
  masivo?: boolean;
  /** En false solo liga a lo que ya existe (la pasada sobre correos viejos). */
  crear?: boolean;
  /** Avisar por push del lead nuevo. */
  avisar?: boolean;
};

export type ResultadoVinculo =
  | { ligado: false; sugerido?: boolean }
  | { ligado: true; leadId: string | null; clientId: string | null; leadNuevo: boolean; por: string };

/** Liga un correo recién guardado a su lead o cliente; crea el lead si es una solicitud nueva. Nunca lanza. */
export async function vincularCorreo(correo: InboxEmail, op: OpcionesVinculo = {}): Promise<ResultadoVinculo> {
  try {
    if (correo.vinculo === "manual" || correo.vinculo === "ignorado") return { ligado: false };
    if (["TRASH", "SPAM", "DRAFTS"].includes(correo.folder)) return { ligado: false };
    const propias = await direccionesPropias(correo.userId);

    // El aviso del formulario de la web llega de nuestro propio buzón: la contraparte es quien llenó el formulario.
    const formulario = correo.folder === "INBOX" && isContactFormEmail(correo.subject) ? parseContactEmail(correo.bodyText) : null;
    const direcciones = formulario ? [formulario.email] : contrapartes(correo, propias);
    if (!direcciones.length) return { ligado: false };

    const c = await buscarCoincidencias(correo, direcciones);
    const remitente = direcciones[0];
    const puedeCrear =
      op.crear !== false && correo.folder === "INBOX" && !op.masivo && !esBuzonAutomatico(remitente) &&
      !(op.etiquetas ?? []).includes("spam") && (!!formulario || !!op.solicitud);
    const d = decidir(c, puedeCrear);
    const datosSolicitud = op.solicitud ? { solicitud: op.solicitud as unknown as PrismaNs.InputJsonValue } : {};

    if (d.tipo === "nada") {
      if (op.solicitud) await prisma.inboxEmail.update({ where: { id: correo.id }, data: datosSolicitud });
      return { ligado: false };
    }

    // Solicitud de alguien desconocido: la IA solo sugiere. El lead se crea cuando el equipo lo aprueba en el correo.
    if (d.tipo === "crear-lead" && !formulario) {
      await prisma.inboxEmail.update({ where: { id: correo.id }, data: datosSolicitud });
      if (op.avisar !== false) await avisarSugerencia(correo, remitente, op.solicitud!);
      return { ligado: false, sugerido: true };
    }

    let leadId = d.tipo === "ligar" ? d.leadId : null;
    const clientId = d.tipo === "ligar" ? d.clientId : null;
    let leadNuevo = false;

    // El aviso del formulario de la web cuyo lead no quedó guardado (la ruta /api/contact falló): datos ya
    // estructurados por el formulario, no por la IA, así que se guarda como lo habría hecho la ruta.
    if (d.tipo === "crear-lead" && formulario) {
      leadId = (await persistLead({ userId: correo.userId, ...formulario, receivedAt: correo.receivedAt })).lead.id;
      leadNuevo = true;
    }

    await prisma.inboxEmail.update({ where: { id: correo.id }, data: { leadId, clientId, vinculo: "auto", ...datosSolicitud } });
    await efectosDelCorreo(correo, { leadId, clientId });
    return { ligado: true, leadId, clientId, leadNuevo, por: d.tipo === "ligar" ? d.por : "formulario" };
  } catch (err) {
    console.error("[vinculo-correo] no se pudo ligar el correo", correo.id, err);
    return { ligado: false };
  }
}

async function crearLeadDeCorreo(correo: InboxEmail, direccion: string, s: SolicitudCotizacion | Partial<SolicitudCotizacion>) {
  const buzon = await prisma.mailAccount.findUnique({ where: { id: correo.accountId }, select: { username: true } });
  return prisma.lead.create({
    data: {
      userId: correo.userId,
      name: nombreDelRemitente(s.nombre, correo.fromName, direccion),
      email: direccion,
      company: s.empresa || null,
      phone: s.telefono || null,
      source: "CORREO",
      status: "NUEVO",
      priority: (s.prioridad ?? "MEDIA") as LeadPriority,
      priorityReason: s.necesidad ? `Pidió por correo: ${s.necesidad}`.slice(0, 240) : null,
      estimatedValue: s.valorEstimado ?? null,
      notes: notaDeSolicitud({ fecha: correo.receivedAt, buzon: buzon?.username ?? "el buzón", asunto: correo.subject, necesidad: s.necesidad || "(ver correo)", cuerpo: cuerpoPlano(correo.bodyText) }),
      createdAt: correo.receivedAt,
    },
  });
}

async function avisarSugerencia(correo: InboxEmail, direccion: string, s: SolicitudCotizacion) {
  const nombre = nombreDelRemitente(s.nombre, correo.fromName, direccion);
  const quien = s.empresa ? `${nombre} · ${s.empresa}` : nombre;
  await notifyUser({
    userId: correo.userId,
    title: `¿Lead nuevo? ${quien} pide cotización`,
    body: `${s.necesidad} — Revísalo y apruébalo en el correo.`,
    link: `/empresa/correos/hub/${correo.id}`,
    tag: `solicitud-${correo.id}`,
  });
}

/**
 * Lo que mueve un correo ligado: el cliente anota su último contacto; un lead NUEVO al que ya le escribimos pasa
 * a CONTACTADO.
 */
async function efectosDelCorreo(correo: Pick<InboxEmail, "folder" | "receivedAt" | "userId">, a: { leadId: string | null; clientId: string | null }) {
  const cuando = correo.receivedAt;
  await Promise.all([
    a.clientId
      ? prisma.client.updateMany({ where: { id: a.clientId, userId: correo.userId, OR: [{ ultimoContactoAt: null }, { ultimoContactoAt: { lt: cuando } }] }, data: { ultimoContactoAt: cuando } })
      : null,
    a.leadId && correo.folder === "SENT"
      ? prisma.lead.updateMany({ where: { id: a.leadId, userId: correo.userId, status: "NUEVO" }, data: { status: "CONTACTADO" } })
      : null,
  ]);
}

// ─── A mano, desde el correo ─────────────────────────────────────────────────

/**
 * Liga a mano un correo, su hilo y los demás correos sin dueño de la misma dirección. Así lo que llegue después
 * de esa dirección cae solo en el mismo lugar.
 */
export async function ligarAMano(userId: string, correo: InboxEmail, a: { leadId: string | null; clientId: string | null }) {
  const propias = await direccionesPropias(userId);
  const direcciones = contrapartes(correo, propias);
  await prisma.$transaction([
    prisma.inboxEmail.update({ where: { id: correo.id }, data: { ...a, vinculo: "manual" } }),
    prisma.$executeRaw(Prisma.sql`
      UPDATE "InboxEmail" m SET "leadId" = ${a.leadId}, "clientId" = ${a.clientId}, vinculo = 'auto'
      WHERE m."userId" = ${userId} AND m.id <> ${correo.id} AND (m.vinculo IS NULL OR m.vinculo = 'auto')
        AND m."leadId" IS NULL AND m."clientId" IS NULL
        AND (
          (${correo.threadKey}::text IS NOT NULL AND m."threadKey" = ${correo.threadKey})
          OR (cardinality(${direcciones}::text[]) > 0 AND (
                lower(m."fromEmail") = ANY(${direcciones}::text[])
                OR EXISTS (SELECT 1 FROM unnest(m."toAddresses" || m."ccAddresses") t(d) WHERE lower(trim(t.d)) = ANY(${direcciones}::text[]))))
        )`),
  ]);
  await efectosDelCorreo(correo, a);
  return direcciones;
}

/** Crea el lead con los datos que el equipo revisó en el correo. Si ya hay un lead con ese correo, usa ese. */
export async function crearLeadDesdeCorreo(
  userId: string,
  correo: InboxEmail,
  datos: { nombre: string; email: string; empresa: string | null; telefono: string | null; necesidad: string },
): Promise<{ lead: Lead; existia: boolean }> {
  const existente = await prisma.lead.findFirst({ where: { userId, email: { equals: datos.email, mode: "insensitive" } }, orderBy: { updatedAt: "desc" } });
  if (existente) return { lead: existente, existia: true };
  const s = (correo.solicitud ?? {}) as Partial<SolicitudCotizacion>;
  const lead = await crearLeadDeCorreo(correo, datos.email, {
    ...s,
    nombre: datos.nombre, empresa: datos.empresa, telefono: datos.telefono, necesidad: datos.necesidad || s.necesidad || "",
  });
  return { lead, existia: false };
}
