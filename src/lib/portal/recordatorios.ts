/**
 * Recordatorios de cobro (tarea diaria). Para cada factura con saldo:
 *   - 3 días antes, el día del vencimiento y 7 días después → aviso al equipo (campana y celular) y,
 *     si el cliente tiene cuenta activa, correo a sus personas con enlace a su cuenta.
 * Cada etapa se avisa una sola vez: queda registrada en la línea de tiempo (ActivityEvent).
 * Las cuotas (PaymentSchedule) siguen como antes: vencidas pasan a OVERDUE.
 */
import { enviarAlCliente } from "@/lib/motor/envios";
import { prisma } from "@/lib/prisma";
import { getPortalInvoiceReminderEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";
import { notifyUser } from "@/lib/notifications/notify";
import { emitidoDe, pagadoDeFactura } from "./saldo";
import { dinero } from "./datos";
import { registrarEvento } from "./eventos";

const DIA = 86_400_000;
export const etapaDe = (due: Date, hoy: Date): "antes" | "hoy" | "vencida" | null => {
  const d = Math.floor((Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) - Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())) / DIA);
  if (d === 3) return "antes";
  if (d === 0) return "hoy";
  if (d === -7) return "vencida";
  return null;
};

export async function correrRecordatorios(hoy = new Date()) {
  await prisma.paymentSchedule.updateMany({ where: { status: "PENDING", dueDate: { lt: hoy } }, data: { status: "OVERDUE" } });

  const facturas = await prisma.document.findMany({
    where: { type: "FACTURA", status: { in: ["SENT", "ACCEPTED", "PARTIALLY_PAID"] }, dueDate: { gte: new Date(hoy.getTime() - 8 * DIA), lte: new Date(hoy.getTime() + 4 * DIA) } },
    select: { id: true, userId: true, clientId: true, number: true, total: true, amountPaid: true, dueDate: true, clientName: true },
  });
  let equipo = 0, clientes = 0;
  for (const f of facturas) {
    const etapa = etapaDe(f.dueDate!, hoy);
    if (!etapa || !f.clientId) continue;
    const marca = `recordatorio_${etapa}`;
    const ya = await prisma.activityEvent.findFirst({ where: { entityType: "factura", entityId: f.id, kind: marca }, select: { id: true } });
    if (ya) continue;
    const [pagos, cuotas] = await Promise.all([
      prisma.payment.findMany({ where: { documentId: f.id }, select: { documentId: true, amount: true, status: true } }),
      prisma.paymentSchedule.findMany({ where: { documentId: f.id }, select: { documentId: true, amount: true, dueDate: true, status: true } }),
    ]);
    // Al cliente solo se le recuerda lo emitido, no el total de un contrato con anticipo o cuotas.
    const pagado = Math.max(pagadoDeFactura(f.id, pagos), Number(f.amountPaid ?? 0));
    const falta = emitidoDe(f.total, pagado, cuotas, hoy).emitido - pagado;
    if (falta <= 0.005) continue;
    const vence = f.dueDate!.toLocaleDateString("es-PA", { day: "numeric", month: "long", timeZone: "UTC" });

    await notifyUser({ userId: f.userId, title: etapa === "vencida" ? `Factura vencida · ${f.number}` : `Cobro ${etapa === "hoy" ? "hoy" : "en 3 días"} · ${f.number}`, body: `${f.clientName ?? "Cliente"}: ${dinero(falta)}`, link: `/empresa/clientes/${f.clientId}`, tag: `cobro-${f.id}` }).catch(() => {});
    equipo++;
    const personas = await prisma.clientUser.findMany({ where: { clientId: f.clientId, status: "activo" }, select: { email: true, fullName: true, role: true } });
    if (personas.length) {
      const principal = personas.find((p) => p.role === "principal") ?? personas[0];
      const c = getPortalInvoiceReminderEmail({ name: principal.fullName, number: f.number ?? "", amount: dinero(falta), due: vence, stage: etapa, link: `${getSiteUrl()}/cliente/facturas` });
      try { const r = await enviarAlCliente({ to: personas.map((p) => p.email), subject: c.subject, html: c.html, motivo: `recordatorio ${f.number}` }); if (r.enviado) clientes++; } catch (e) { console.error("[recordatorios] correo", f.id, e); }
    }
    await registrarEvento({ userId: f.userId, clientId: f.clientId, entityType: "factura", entityId: f.id, kind: marca, title: `Recordatorio de cobro ${etapa === "antes" ? "(3 días antes)" : etapa === "hoy" ? "(vence hoy)" : "(7 días vencida)"}: ${f.number}`, detail: `${dinero(falta)}${personas.length ? " · correo al cliente" : ""}`, visibility: "interno", actorType: "sistema" });
  }
  return { facturas: facturas.length, avisosEquipo: equipo, correosClientes: clientes };
}
