import { prisma } from "@/lib/prisma";
import { getQuoteLinkedInvoiceId } from "@/lib/quote-to-invoice";
import type { Document } from "@prisma/client";

export const QUOTE_BALANCE_SCHEDULE_DESC = "Saldo pendiente — cotización vs factura";
export const INVOICE_PARTIAL_SCHEDULE_DESC = "Saldo pendiente — pago parcial";

type InvoicePaymentSlice = {
  status: string;
  total: unknown;
  amountPaid: unknown;
};

export function invoiceCollectedAmount(invoice: InvoicePaymentSlice): number {
  if (invoice.status === "PAID") return Number(invoice.total ?? 0);
  if (invoice.status === "PARTIALLY_PAID") return Number(invoice.amountPaid ?? 0);
  return 0;
}

export type QuoteBalanceState = {
  quoteTotal: number;
  invoicedTotal: number;
  collected: number;
  pendingBalance: number;
  hasLinkedInvoice: boolean;
};

export function computeQuoteBalanceFromInvoices(
  quoteTotal: number,
  invoices: InvoicePaymentSlice[]
): QuoteBalanceState {
  const invoicedTotal = invoices.reduce((sum, inv) => sum + Number(inv.total ?? 0), 0);
  const collected = invoices.reduce((sum, inv) => sum + invoiceCollectedAmount(inv), 0);
  const pendingBalance = Math.max(0, Math.round((quoteTotal - collected) * 100) / 100);

  return {
    quoteTotal,
    invoicedTotal,
    collected,
    pendingBalance,
    hasLinkedInvoice: invoices.length > 0,
  };
}

export function computeQuoteBalance(
  quoteTotal: number,
  invoice: InvoicePaymentSlice | null | undefined
): QuoteBalanceState {
  if (!invoice) {
    return { quoteTotal, invoicedTotal: 0, collected: 0, pendingBalance: quoteTotal, hasLinkedInvoice: false };
  }
  return computeQuoteBalanceFromInvoices(quoteTotal, [invoice]);
}

async function getInvoicesForQuote(quoteId: string, userId: string) {
  return prisma.document.findMany({
    where: {
      userId,
      type: "FACTURA",
      OR: [
        { linkedDocumentId: quoteId },
        { content: { path: ["sourceQuoteId"], equals: quoteId } },
      ],
    },
    select: { id: true, status: true, total: true, amountPaid: true },
  });
}

async function resolveLinkedInvoiceForQuote(
  quote: Pick<Document, "id" | "userId" | "content" | "linkedDocumentId">,
  linkedDocument?: InvoicePaymentSlice & { id: string; type: string } | null
) {
  if (linkedDocument?.type === "FACTURA") return linkedDocument;

  const linkedId = quote.linkedDocumentId ?? getQuoteLinkedInvoiceId(quote.content);
  if (!linkedId) return null;

  return prisma.document.findFirst({
    where: { id: linkedId, userId: quote.userId, type: "FACTURA" },
    select: { id: true, type: true, status: true, total: true, amountPaid: true },
  });
}

/** Crea/actualiza la cuota de saldo en la cotización cuando la factura vinculada no cubre el total. */
export async function syncQuoteInvoiceBalance(quoteId: string, userId: string): Promise<void> {
  const quote = await prisma.document.findFirst({
    where: { id: quoteId, userId, type: "COTIZACION" },
    include: {
      linkedDocument: {
        select: { id: true, type: true, status: true, total: true, amountPaid: true },
      },
    },
  });
  if (!quote) return;

  const invoices = await getInvoicesForQuote(quoteId, userId);
  if (invoices.length === 0) return;

  const quoteTotal = Number(quote.total ?? 0);
  const { collected, invoicedTotal } = computeQuoteBalanceFromInvoices(quoteTotal, invoices);
  const allInvoicesPaid = invoices.every((inv) => inv.status === "PAID");

  // La cuota de saldo cubre solo la porción NO facturada. El saldo de las
  // facturas ya emitidas lo aporta cada factura (total - amountPaid) en
  // Cuentas por Cobrar; contarlo aquí también lo duplicaría.
  const uninvoiced = Math.max(0, Math.round((quoteTotal - invoicedTotal) * 100) / 100);
  const pendingBalance = Math.max(0, Math.round((quoteTotal - collected) * 100) / 100);

  // Idempotente a propósito: NO se borra y recrea la cuota. Hacerlo cambiaba su
  // id en cada carga de página, y dos cargas concurrentes creaban duplicados —
  // por eso "Cobrar" fallaba con "Cuota no encontrada" sobre un id ya borrado.
  const existentes = await prisma.paymentSchedule.findMany({
    where: {
      documentId: quoteId,
      status: { in: ["PENDING", "OVERDUE"] },
      description: QUOTE_BALANCE_SCHEDULE_DESC,
    },
    orderBy: { createdAt: "asc" },
  });

  if (uninvoiced > 0.01) {
    const dueDate =
      quote.dueDate ??
      quote.validUntil ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [conservar, ...sobrantes] = existentes;

    if (conservar) {
      // Solo escribe si de verdad cambió el monto.
      if (Math.abs(Number(conservar.amount) - uninvoiced) > 0.001) {
        await prisma.paymentSchedule.update({
          where: { id: conservar.id },
          data: { amount: uninvoiced },
        });
      }
    } else {
      await prisma.paymentSchedule.create({
        data: {
          userId,
          documentId: quoteId,
          description: QUOTE_BALANCE_SCHEDULE_DESC,
          amount: uninvoiced,
          dueDate,
        },
      });
    }

    // Limpia duplicados dejados por carreras anteriores.
    if (sobrantes.length > 0) {
      await prisma.paymentSchedule.deleteMany({
        where: { id: { in: sobrantes.map((s) => s.id) } },
      });
    }

    if (quote.status === "PAID") {
      await prisma.document.update({
        where: { id: quoteId },
        data: { status: "ACCEPTED" },
      });
    }
    return;
  }

  // Ya no queda saldo por facturar: se retiran las cuotas de saldo vivas.
  if (existentes.length > 0) {
    await prisma.paymentSchedule.deleteMany({
      where: { id: { in: existentes.map((s) => s.id) } },
    });
  }

  if (pendingBalance <= 0.01 && collected >= quoteTotal - 0.01 && allInvoicesPaid) {
    await prisma.document.update({
      where: { id: quoteId },
      data: { status: "PAID" },
    });
  }
}

export async function reconcileUserQuoteBalances(userId: string): Promise<void> {
  const quotes = await prisma.document.findMany({
    where: {
      userId,
      type: "COTIZACION",
      status: { in: ["ACCEPTED", "PAID"] },
    },
    select: { id: true, linkedDocumentId: true, content: true },
  });

  for (const quote of quotes) {
    const hasLink = quote.linkedDocumentId || getQuoteLinkedInvoiceId(quote.content);
    if (hasLink) await syncQuoteInvoiceBalance(quote.id, userId);
  }
}

export async function getQuoteBalanceStateForQuote(
  quoteId: string,
  userId: string
): Promise<QuoteBalanceState | null> {
  const quote = await prisma.document.findFirst({
    where: { id: quoteId, userId, type: "COTIZACION" },
    include: {
      linkedDocument: {
        select: { id: true, type: true, status: true, total: true, amountPaid: true },
      },
      paymentSchedules: {
        where: { status: { in: ["PENDING", "OVERDUE"] }, description: QUOTE_BALANCE_SCHEDULE_DESC },
        select: { amount: true },
      },
    },
  });
  if (!quote) return null;

  const invoice = await resolveLinkedInvoiceForQuote(quote, quote.linkedDocument);
  const invoices = await getInvoicesForQuote(quoteId, userId);
  const state =
    invoices.length > 0
      ? computeQuoteBalanceFromInvoices(Number(quote.total ?? 0), invoices)
      : computeQuoteBalance(Number(quote.total ?? 0), invoice);

  if (state.pendingBalance > 0 && quote.paymentSchedules.length > 0) {
    return state;
  }
  if (state.pendingBalance > 0 && state.collected > 0) {
    return state;
  }

  return state.hasLinkedInvoice ? state : null;
}
