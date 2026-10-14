/**
 * Envíos a clientes. El interruptor de Configuración → Clientes apaga solo lo AUTOMÁTICO: recordatorios de
 * cobro y avisos de tickets (decisión del 2026-10-11, aclarada el 2026-10-14: «lo apagado son envíos
 * automáticos, no manuales»). Lo que una persona manda con un botón —invitaciones, órdenes de cambio— y la
 * recuperación de clave que pide el propio cliente salen siempre. Lo bloqueado queda en el log y no rompe
 * la acción. PIME_ENVIOS_CLIENTES=off apaga todo, manual incluido, aunque la configuración diga lo contrario.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-service";

export async function enviosAClientesActivos(): Promise<boolean> {
  if (process.env.PIME_ENVIOS_CLIENTES === "off") return false;
  const c = await prisma.companyConfig.findFirst({ where: { clientEmailsEnabled: true }, select: { id: true } }).catch(() => null);
  return !!c;
}

export type ResultadoEnvio = { enviado: boolean; bloqueado?: boolean };

/**
 * Único camino para escribirle a un cliente. `manual`: lo pidió una persona en ese momento (botón de
 * invitar, enviar una orden, recuperar la clave); no lo frena el interruptor de automáticos.
 */
export async function enviarAlCliente(p: { to: string | string[]; subject: string; html: string; motivo: string; manual?: boolean }): Promise<ResultadoEnvio> {
  const permitido = p.manual ? process.env.PIME_ENVIOS_CLIENTES !== "off" : await enviosAClientesActivos();
  if (!permitido) {
    console.info(`[envios] bloqueado (envíos a clientes apagados): ${p.motivo}`);
    return { enviado: false, bloqueado: true };
  }
  await sendEmail({ to: p.to, subject: p.subject, html: p.html });
  return { enviado: true };
}
