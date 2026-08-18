import { prisma } from "@/lib/prisma";
import { INVOICE_PARTIAL_SCHEDULE_DESC } from "@/lib/quote-balance";

/**
 * Limpia las cuotas legacy "Saldo pendiente — pago parcial": ese saldo hoy
 * vive en la propia factura (`total - amountPaid`), así que dejarlas vivas
 * duplicaría el monto en Cuentas por Cobrar y las volvería inmortales
 * cuando la factura se termina de cobrar.
 */
export async function clearLegacyPartialSchedules(documentId: string): Promise<void> {
  await prisma.paymentSchedule.deleteMany({
    where: {
      documentId,
      status: { in: ["PENDING", "OVERDUE"] },
      description: INVOICE_PARTIAL_SCHEDULE_DESC,
    },
  });
}

/**
 * Cierra un documento cobrado por completo: deja `amountPaid` igual al total
 * y marca como pagadas todas sus cuotas pendientes, para que el ítem
 * desaparezca de Cuentas por Cobrar en vez de quedar colgado.
 */
export async function settleDocumentSchedules(documentId: string): Promise<void> {
  await clearLegacyPartialSchedules(documentId);
  await prisma.paymentSchedule.updateMany({
    where: { documentId, status: { in: ["PENDING", "OVERDUE"] } },
    data: { status: "PAID", paidAt: new Date() },
  });
}
