/**
 * Envíos a clientes: APAGADOS hasta que el equipo los encienda en Configuración → Clientes
 * (decisión del 2026-10-11: «por el momento no se envía ninguna comunicación a ningún cliente»).
 * Cubre todo lo automático y lo del portal: invitaciones, recuperación de clave, recordatorios de cobro,
 * avisos de tickets y órdenes de cambio. Lo bloqueado queda en el log y no rompe la acción.
 * PIME_ENVIOS_CLIENTES=off apaga todo aunque la configuración diga lo contrario.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-service";

export async function enviosAClientesActivos(): Promise<boolean> {
  if (process.env.PIME_ENVIOS_CLIENTES === "off") return false;
  const c = await prisma.companyConfig.findFirst({ where: { clientEmailsEnabled: true }, select: { id: true } }).catch(() => null);
  return !!c;
}

export type ResultadoEnvio = { enviado: boolean; bloqueado?: boolean };

/** Único camino para escribirle a un cliente. Si los envíos están apagados, no sale nada. */
export async function enviarAlCliente(p: { to: string | string[]; subject: string; html: string; motivo: string }): Promise<ResultadoEnvio> {
  if (!(await enviosAClientesActivos())) {
    console.info(`[envios] bloqueado (envíos a clientes apagados): ${p.motivo}`);
    return { enviado: false, bloqueado: true };
  }
  await sendEmail({ to: p.to, subject: p.subject, html: p.html });
  return { enviado: true };
}
