/**
 * Envíos a clientes: invitaciones, recuperación de clave, órdenes de cambio, recordatorios de cobro y avisos
 * de tickets. Sin interruptores: desde el 2026-10-14 todo sale (pedido de Javier: «quita los bloqueos de envío
 * de correos completamente»). Es el único camino para escribirle a un cliente; si Resend falla, lanza el error.
 */
import { sendEmail } from "@/lib/email-service";

export type ResultadoEnvio = { enviado: boolean };

export async function enviarAlCliente(p: { to: string | string[]; subject: string; html: string; motivo: string }): Promise<ResultadoEnvio> {
  await sendEmail({ to: p.to, subject: p.subject, html: p.html });
  console.info(`[envios] enviado: ${p.motivo}`);
  return { enviado: true };
}
