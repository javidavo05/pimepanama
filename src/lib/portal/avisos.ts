/**
 * Avisos de Pime Clientes. Al equipo: campana + celular (notifyUser) y correo. Al cliente: correo.
 * Nunca rompen la acción: si un aviso falla, queda en el log.
 */
import { enviarAlCliente } from "@/lib/motor/envios";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications/notify";
import { sendEmail } from "@/lib/email-service";
import { getPimeTicketAlertEmail, getPortalTicketUpdateEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";
import { TICKET_ESTADO_LABEL, TICKET_TIPO_LABEL, type TicketEstado, type TicketTipo } from "./estados";

/** Un cliente abrió un ticket o escribió en uno: aviso al dueño de la cuenta Pime. */
export async function avisarAlEquipoTicket(ticketId: string, mensaje: string, nuevo: boolean) {
  try {
    const t = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, number: true, title: true, kind: true, userId: true, user: { select: { email: true, config: { select: { email: true } } } }, client: { select: { name: true, company: true } }, openedByClient: { select: { fullName: true, email: true } }, _count: { select: { attachments: true } } },
    });
    if (!t) return;
    const cliente = t.client.company || t.client.name;
    const link = `/empresa/tickets/${t.id}`;
    await notifyUser({ userId: t.userId, title: `${nuevo ? "Ticket nuevo" : "Respuesta"} · ${cliente}`, body: `${t.number} ${t.title}: ${mensaje.slice(0, 140)}`, link, tag: `ticket-${t.id}` });
    const to = t.user.config?.email || t.user.email;
    if (to) {
      const c = getPimeTicketAlertEmail({ client: cliente, person: t.openedByClient?.fullName || t.openedByClient?.email, number: t.number, title: t.title, kind: TICKET_TIPO_LABEL[t.kind as TicketTipo] ?? t.kind, message: mensaje, attachments: t._count.attachments, link: `${getSiteUrl()}${link}` });
      await sendEmail({ to, subject: c.subject, html: c.html });
    }
  } catch (e) {
    console.error("[portal] aviso al equipo", e);
  }
}

/** Pime respondió o cambió el estado: correo a la persona que abrió el ticket. */
export async function avisarAlClienteTicket(ticketId: string, mensaje?: string | null) {
  try {
    const t = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, number: true, title: true, status: true, openedByClient: { select: { email: true, fullName: true, status: true } } } });
    const p = t?.openedByClient;
    if (!t || !p || p.status !== "activo") return;
    const c = getPortalTicketUpdateEmail({ name: p.fullName, number: t.number, title: t.title, status: TICKET_ESTADO_LABEL[t.status as TicketEstado] ?? t.status, message: mensaje, link: `${getSiteUrl()}/cliente/tickets/${t.id}` });
    await enviarAlCliente({ to: p.email, subject: c.subject, html: c.html, motivo: `ticket ${t.number}` });
  } catch (e) {
    console.error("[portal] aviso al cliente", e);
  }
}

/** Aviso genérico al equipo (aprobaciones, pagos reportados). */
export async function avisarAlEquipo(userId: string, title: string, body: string, link: string) {
  try { await notifyUser({ userId, title, body, link }); } catch (e) { console.error("[portal] aviso", e); }
}
