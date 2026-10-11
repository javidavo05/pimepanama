/** Avisos del Pulso al equipo. Grave = campana + celular + correo. Lo demás = solo campana. Nunca lanzan. */
import { notifyUser } from "@/lib/notifications/notify";
import { sendEmail } from "@/lib/email-service";
import { getPulsoAlertEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";
import { prisma } from "@/lib/prisma";

/** Lo que se habría avisado con los avisos apagados (para las pruebas). */
export const avisosApagados: { sistema: string; titulo: string; grave: boolean; recuperado?: boolean }[] = [];

type Sistema = { id: string; userId: string; name: string; client: { name: string; company: string | null } };

export async function avisarPulso(s: Sistema, p: { titulo: string; detalle?: string | null; grave: boolean; recuperado?: boolean }) {
  const link = `/empresa/sistemas/${s.id}`;
  // Las pruebas apagan los avisos reales (campana, celular y correo).
  if (process.env.PIME_PULSO_AVISOS === "off") { avisosApagados.push({ sistema: s.name, ...p }); return; }
  const cliente = s.client.company || s.client.name;
  try {
    await notifyUser({ userId: s.userId, title: `${s.name} · ${p.titulo}`, body: (p.detalle || cliente).slice(0, 180), link, tag: `pulso-${s.id}`, push: p.grave || !!p.recuperado });
  } catch (e) {
    console.error("[pulso] aviso", e);
  }
  if (!p.grave) return;
  try {
    const u = await prisma.empresaUser.findUnique({ where: { id: s.userId }, select: { email: true, config: { select: { email: true } } } });
    const to = u?.config?.email || u?.email;
    if (!to) return;
    const c = getPulsoAlertEmail({ system: s.name, client: cliente, title: p.titulo, detail: p.detalle, link: `${getSiteUrl()}${link}`, recovered: p.recuperado });
    await sendEmail({ to, subject: c.subject, html: c.html });
  } catch (e) {
    console.error("[pulso] correo", e);
  }
}
