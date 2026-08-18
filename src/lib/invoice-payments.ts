import { prisma } from "@/lib/prisma";
import { syncQuoteInvoiceBalance } from "@/lib/quote-balance";
import { clearLegacyPartialSchedules, settleDocumentSchedules } from "@/lib/invoice-settlement";
import type { DocumentStatus } from "@prisma/client";

/**
 * Lógica de cobro de facturas, sin dependencia de la sesión ni de Next —
 * las server actions son envoltorios que agregan auth y revalidatePath.
 * Vivir aparte la hace verificable contra la base de datos.
 */

export type PaymentResult = {
  status: DocumentStatus;
  amountPaid: number;
  total: number;
  outstanding: number;
};

/**
 * Registra un cobro sobre una factura. El monto es INCREMENTAL: se suma a lo
 * ya cobrado, así que varios abonos parciales se acumulan. Cuando lo cobrado
 * alcanza el total, la factura pasa a PAID y sus cuotas pendientes se cierran
 * — es lo que la hace desaparecer de Cuentas por Cobrar.
 */
export async function registerInvoicePayment(
  userId: string,
  documentId: string,
  paymentAmount: number,
  remainderDueDate?: string
): Promise<PaymentResult> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId, type: "FACTURA" },
  });
  if (!doc) throw new Error("Factura no encontrada");

  const total = Number(doc.total ?? 0);
  if (total <= 0) throw new Error("La factura no tiene un total válido");

  const payment = Math.max(0, paymentAmount);
  if (payment <= 0) throw new Error("El monto del pago debe ser mayor a cero");

  const alreadyPaid = Number(doc.amountPaid ?? 0);
  const paid = Math.min(total, Math.round((alreadyPaid + payment) * 100) / 100);
  const isSettled = paid >= total - 0.01;
  const status: DocumentStatus = isSettled ? "PAID" : "PARTIALLY_PAID";
  const amountPaid = isSettled ? total : paid;

  await prisma.document.update({
    where: { id: documentId },
    data: {
      status,
      amountPaid,
      // El saldo restante vence en la fecha indicada; sin cuota aparte.
      ...(!isSettled && remainderDueDate ? { dueDate: new Date(remainderDueDate) } : {}),
    },
  });

  if (isSettled) {
    await settleDocumentSchedules(documentId);
  } else {
    await clearLegacyPartialSchedules(documentId);
  }

  if (doc.linkedDocumentId) {
    await syncQuoteInvoiceBalance(doc.linkedDocumentId, userId);
  }

  return { status, amountPaid, total, outstanding: Math.round((total - amountPaid) * 100) / 100 };
}

/** Deshace los cobros de una factura y la devuelve a estado abierto. */
export async function resetInvoicePayment(userId: string, documentId: string): Promise<void> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId, type: "FACTURA" },
  });
  if (!doc) throw new Error("Factura no encontrada");

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "SENT", amountPaid: null },
  });
  await clearLegacyPartialSchedules(documentId);

  if (doc.linkedDocumentId) {
    await syncQuoteInvoiceBalance(doc.linkedDocumentId, userId);
  }
}

/** Cobra una cuota y acredita el dinero en la factura a la que pertenece. */
export async function collectSchedule(userId: string, scheduleId: string): Promise<void> {
  const existing = await prisma.paymentSchedule.findFirst({
    where: { id: scheduleId, userId },
    include: {
      document: {
        select: { id: true, type: true, total: true, amountPaid: true, linkedDocumentId: true },
      },
    },
  });
  if (!existing) throw new Error("Cuota no encontrada");

  await prisma.paymentSchedule.update({
    where: { id: scheduleId },
    data: { status: "PAID", paidAt: new Date() },
  });

  const doc = existing.document;

  // Cobrar una cuota de factura es dinero recibido: se acredita en la factura.
  if (doc.type === "FACTURA") {
    const total = Number(doc.total ?? 0);
    const paid = Math.min(
      total,
      Math.round((Number(doc.amountPaid ?? 0) + Number(existing.amount)) * 100) / 100
    );
    const isSettled = total > 0 && paid >= total - 0.01;
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        amountPaid: isSettled ? total : paid,
        status: isSettled ? "PAID" : "PARTIALLY_PAID",
      },
    });
    if (isSettled) await settleDocumentSchedules(doc.id);
    if (doc.linkedDocumentId) await syncQuoteInvoiceBalance(doc.linkedDocumentId, userId);
  } else {
    // Cotización: si ya no queda ninguna cuota viva, queda saldada.
    const pendingCount = await prisma.paymentSchedule.count({
      where: { documentId: doc.id, status: { in: ["PENDING", "OVERDUE"] } },
    });
    if (pendingCount === 0) {
      await prisma.document.update({ where: { id: doc.id }, data: { status: "PAID" } });
    }
  }
}

/** Marca un documento como cobrado por completo y cierra sus cuotas vivas. */
export async function markDocumentPaid(userId: string, documentId: string): Promise<void> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true, type: true, total: true, linkedDocumentId: true },
  });
  if (!doc) throw new Error("Documento no encontrado");

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PAID", ...(doc.total != null ? { amountPaid: doc.total } : {}) },
  });
  await settleDocumentSchedules(documentId);

  if (doc.type === "FACTURA" && doc.linkedDocumentId) {
    await syncQuoteInvoiceBalance(doc.linkedDocumentId, userId);
  }
}
