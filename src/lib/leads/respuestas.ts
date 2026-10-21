/**
 * Respuestas a leads por tandas (migración 0063). El agente de prospección deja, por cada lead, un correo y un
 * mensaje de LinkedIn redactados; aquí se leen, se les arma la propuesta en PDF y se envían desde un buzón de Pime.
 *
 * Nada sale solo: cada envío lo dispara alguien del equipo desde /empresa/leads: la IA sugiere, no envía.
 */
import type { MailAccount, RespuestaLead } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMailFromAccount, assertResendConfigured } from "@/lib/mail/mail-send";
import { persistSentEmail } from "@/lib/mail/persist-sent-email";
import { renderPropuestaProspectoPdf } from "@/lib/pdf/render";
import { leerPropuesta, redactarPropuesta, type PropuestaProspecto } from "./propuesta-prospecto";
import { tokenBaja } from "@/lib/crm/correo-baja";
import { getSiteUrl } from "@/lib/site-url";
import { archivoPropuesta, faltaParaEnviar, type EstadoRespuesta, type RespuestaVista } from "./respuestas-comun";

export { loteDeAhora, type RespuestaVista } from "./respuestas-comun";

type ConLead = RespuestaLead & { lead: { id: string; name: string; company: string | null; status: string; priority: string; notes: string | null } };

export function aVista(r: ConLead): RespuestaVista {
  return {
    id: r.id,
    lote: r.lote,
    idioma: r.idioma,
    para: r.para,
    asunto: r.asunto,
    cuerpo: r.cuerpo,
    mensajeLinkedin: r.mensajeLinkedin,
    linkedinUrl: r.linkedinUrl,
    adjuntarPdf: r.adjuntarPdf,
    estado: r.estado as EstadoRespuesta,
    error: r.error,
    enviadaAt: r.enviadaAt?.toISOString() ?? null,
    correoId: r.correoId,
    linkedinAt: r.linkedinAt?.toISOString() ?? null,
    tienePropuesta: leerPropuesta(r.propuesta) != null,
    createdAt: r.createdAt.toISOString(),
    lead: {
      id: r.lead.id, name: r.lead.name, company: r.lead.company, status: r.lead.status, priority: r.lead.priority,
      sitio: r.lead.notes?.match(/^Sitio: (\S+)/m)?.[1] ?? null,
    },
  };
}

const CON_LEAD = { lead: { select: { id: true, name: true, company: true, status: true, priority: true, notes: true } } } as const;

export async function respuestasDelPanel(userId: string): Promise<RespuestaVista[]> {
  const filas = await prisma.respuestaLead.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 300,
    include: CON_LEAD,
  });
  return filas.map(aVista);
}

export async function unaRespuesta(userId: string, id: string): Promise<RespuestaVista | null> {
  const r = await prisma.respuestaLead.findFirst({ where: { id, userId }, include: CON_LEAD });
  return r ? aVista(r) : null;
}

/** Buzones desde los que se puede enviar. Primero el de la persona que entró, si tiene uno. */
export async function buzonesParaEnviar(userId: string, emailMiembro: string | null) {
  const cuentas = await prisma.mailAccount.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, label: true, username: true },
  });
  const mio = emailMiembro?.toLowerCase();
  return [...cuentas].sort((a, b) => Number(b.username.toLowerCase() === mio) - Number(a.username.toLowerCase() === mio));
}

const DIRECCION = process.env.PIME_DIRECCION_POSTAL || "Pime Panamá · Coco Palace, Avenida Las Amapolas, Ciudad de Panamá, Panamá";

/**
 * El pie de un correo en frío (CAN-SPAM): dirección física y enlace de baja. Si el borrador ya lo traía, se reusa
 * tal cual; si no, se arma con la dirección a la que va.
 */
function pieLegal(cuerpo: string, userId: string, para: string | null, idioma: "es" | "en"): string {
  const previo = cuerpo.match(/\n+—\n[\s\S]*$/)?.[0];
  if (previo) return previo;
  if (!para) return "";
  const baja = `${getSiteUrl()}/baja/${tokenBaja(userId, para.toLowerCase())}`;
  return idioma === "en"
    ? `\n\n—\n${DIRECCION}\nIf you'd rather not hear from us, unsubscribe here: ${baja}`
    : `\n\n—\n${DIRECCION}\nSi prefiere no recibir más correos, dese de baja aquí: ${baja}`;
}

/**
 * La propuesta de la respuesta; la redacta la IA y la guarda si todavía no existe (o si se pide de nuevo). Mientras
 * la respuesta no se haya enviado, el correo se reescribe para que presente la propuesta adjunta (el borrador del
 * agente ofrecía «mandar un resumen»), conservando el pie legal.
 */
export async function asegurarPropuesta(p: { userId: string; supabaseUid: string; id: string; rehacer?: boolean }): Promise<{ propuesta: PropuestaProspecto; empresa: string; idioma: "es" | "en" }> {
  const r = await prisma.respuestaLead.findFirst({ where: { id: p.id, userId: p.userId }, include: { lead: { select: { name: true, company: true, notes: true } } } });
  if (!r) throw new Error("No encontré esa respuesta.");
  const empresa = r.lead.company || r.lead.name;
  const idioma = r.idioma === "en" ? "en" : "es";
  const guardada = p.rehacer ? null : leerPropuesta(r.propuesta);
  if (guardada) return { propuesta: guardada, empresa, idioma };

  // La base es el borrador original del agente (queda en la nota del lead), no el correo ya reescrito: al rehacer,
  // el modelo copiaba lo que ya había escrito, errores incluidos.
  const original = r.lead.notes?.match(/Correo \(borrador, no enviado\):\nAsunto: ([^\n]*)\n\n([\s\S]*?)(?:\n+—\n|$)/);
  const { propuesta } = await redactarPropuesta({
    empresa, idioma, notas: r.lead.notes ?? "", supabaseUid: p.supabaseUid,
    asunto: original?.[1] ?? r.asunto, cuerpo: original?.[2] ?? r.cuerpo,
  });
  const reescribir = propuesta.correo && r.adjuntarPdf && (r.estado === "borrador" || r.estado === "fallo");
  await prisma.respuestaLead.update({
    where: { id: r.id },
    data: {
      propuesta, propuestaAt: new Date(),
      ...(reescribir ? { asunto: propuesta.correo!.asunto, cuerpo: propuesta.correo!.cuerpo.trim() + pieLegal(r.cuerpo, p.userId, r.para, idioma) } : {}),
    },
  });
  return { propuesta, empresa, idioma };
}

export async function pdfDePropuesta(p: { userId: string; supabaseUid: string; id: string }) {
  const { propuesta, empresa, idioma } = await asegurarPropuesta(p);
  const pdf = await renderPropuestaProspectoPdf({ empresa, idioma, propuesta });
  return { pdf, nombre: archivoPropuesta(empresa, idioma) };
}

/**
 * Envía una respuesta desde el buzón elegido, con la propuesta adjunta si está marcada. El correo queda en
 * Enviados y ligado al lead (persistSentEmail → vincularCorreo), lo que pasa el lead de NUEVO a CONTACTADO.
 * Nunca lanza: devuelve el estado final para que la tanda siga con la siguiente.
 */
export async function enviarRespuesta(p: {
  userId: string;
  supabaseUid: string;
  configId: string | null;
  id: string;
  cuenta: MailAccount;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // Se toma la fila antes de enviar: dos clics (o dos pestañas) no mandan el mismo correo dos veces.
  const tomada = await prisma.respuestaLead.updateMany({
    where: { id: p.id, userId: p.userId, estado: { in: ["borrador", "fallo"] } },
    data: { estado: "enviada", error: null },
  });
  if (!tomada.count) return { ok: false, error: "Esa respuesta ya se envió o está descartada." };

  const r = await prisma.respuestaLead.findFirst({ where: { id: p.id }, include: { lead: { select: { company: true, name: true } } } });
  const volver = async (error: string) => {
    await prisma.respuestaLead.update({ where: { id: p.id }, data: { estado: "fallo", error: error.slice(0, 300) } });
    return { ok: false as const, error };
  };
  if (!r) return { ok: false, error: "No encontré esa respuesta." };

  const falta = faltaParaEnviar({ ...r, estado: "borrador" });
  if (falta) return volver(falta);
  const para = r.para!.trim().toLowerCase();

  const baja = await prisma.bajaCorreo.findFirst({ where: { userId: p.userId, email: { equals: para, mode: "insensitive" } }, select: { id: true } });
  if (baja) return volver("Esa dirección se dio de baja: no se le escribe.");

  try {
    assertResendConfigured();
    const adjuntos = r.adjuntarPdf
      ? [await pdfDePropuesta({ userId: p.userId, supabaseUid: p.supabaseUid, id: r.id }).then(({ pdf, nombre }) => ({ filename: nombre, contentType: "application/pdf", content: pdf }))]
      : [];
    const config = p.configId ? await prisma.companyConfig.findFirst({ where: { id: p.configId } }) : null;
    const asunto = r.asunto.trim();
    // Un correo en frío nunca sale sin dirección física ni enlace de baja, aunque se haya borrado al editar.
    const cuerpo = r.cuerpo.includes("/baja/") ? r.cuerpo : r.cuerpo.replace(/\n+—\n[\s\S]*$/, "") + pieLegal("", p.userId, para, r.idioma === "en" ? "en" : "es");

    const res = await sendMailFromAccount({ account: p.cuenta, config, to: para, subject: asunto, body: cuerpo, attachments: adjuntos });
    // El correo ya salió: si guardarlo en Enviados falla, la respuesta igual queda enviada.
    const enviado = await persistSentEmail({
      account: p.cuenta, userId: p.userId, config, subject: asunto, body: cuerpo, toAddresses: [para],
      messageId: res.messageId, resendId: res.resendId, attachments: adjuntos,
      smtpAccepted: res.accepted.map(String), smtpRejected: res.rejected.map(String), smtpResponse: res.response,
    }).catch((e) => { console.error("[respuestas] guardar en Enviados", r.id, e); return null; });

    // vincularCorreo liga por dirección; si no pudo (p. ej. la dirección es de Pime), se liga aquí al lead.
    await Promise.all([
      enviado ? prisma.inboxEmail.updateMany({ where: { id: enviado.id, leadId: null }, data: { leadId: r.leadId, vinculo: "auto" } }) : null,
      prisma.lead.updateMany({ where: { id: r.leadId, userId: p.userId, status: "NUEVO" }, data: { status: "CONTACTADO" } }),
    ]).catch((e) => console.error("[respuestas] ligar al lead", r.id, e));
    await prisma.respuestaLead.update({
      where: { id: r.id },
      data: { estado: "enviada", enviadaAt: new Date(), correoId: enviado?.id ?? null, error: null, para, cuerpo },
    });
    return { ok: true };
  } catch (e) {
    console.error("[respuestas] envío", r.id, e);
    return volver(e instanceof Error ? e.message : "El envío falló.");
  }
}
