import { prisma } from "@/lib/prisma";
import { syncQuoteInvoiceBalance, QUOTE_BALANCE_SCHEDULE_DESC } from "@/lib/quote-balance";
import { registerInvoicePayment } from "@/lib/invoice-payments";
import type { Document } from "@prisma/client";

/**
 * Cobrar un saldo que NO tiene factura detrás (una cotización, o la cuota de
 * saldo de una cotización) genera la factura en el mismo paso. Antes el dinero
 * entraba sin documento fiscal que lo respaldara.
 */

export type CollectResult = {
  /** Factura sobre la que quedó registrado el cobro. */
  invoiceId: string;
  invoiceNumber: string | null;
  /** true si la factura se creó en esta operación. */
  invoiceCreated: boolean;
  amountCollected: number;
};

async function nextInvoiceNumber(userId: string, prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.document.count({ where: { type: "FACTURA", userId } });
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

/** Crea una factura por `amount` a partir de una cotización, ya cobrada. */
async function createInvoiceForQuoteAmount(
  userId: string,
  quote: Document,
  amount: number,
  description: string
): Promise<Document> {
  const config = await prisma.companyConfig.findFirst({ where: { users: { some: { id: userId } } } });
  const prefix = config?.invoicePrefix ?? "FAC";
  const number = await nextInvoiceNumber(userId, prefix);
  const quoteContent = (quote.content ?? {}) as Record<string, unknown>;

  return prisma.document.create({
    data: {
      type: "FACTURA",
      status: "DRAFT", // registerInvoicePayment lo pasa a PAID al acreditar el cobro
      number,
      title: quote.clientName ? `Factura — ${quote.clientName}` : `Factura ${quote.number ?? ""}`.trim(),
      language: quote.language,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      clientCompany: quote.clientCompany,
      clientAddress: quote.clientAddress,
      clientRuc: quote.clientRuc,
      clientId: quote.clientId,
      content: {
        lineItems: [
          { description, quantity: 1, unitPrice: amount, taxPercent: 0, discount: 0 },
        ],
        notes: quoteContent.notes ?? "",
        currency: quote.currency,
        sourceQuoteId: quote.id,
        sourceQuoteNumber: quote.number,
      },
      issueDate: new Date(),
      subtotal: amount,
      taxAmount: 0,
      total: amount,
      currency: quote.currency,
      paymentMethodId: quote.paymentMethodId,
      projectId: quote.projectId ?? undefined,
      contractId: quote.contractId ?? undefined,
      linkedDocumentId: quote.id,
      userId,
      companyId: config?.id ?? undefined,
    },
  });
}

/** Cobra una cuota. Si cuelga de una cotización, emite la factura del monto. */
export async function collectScheduleWithInvoice(
  userId: string,
  scheduleId: string,
  amount?: number
): Promise<CollectResult> {
  const schedule = await prisma.paymentSchedule.findFirst({
    where: { id: scheduleId, userId },
    include: { document: true },
  });
  if (!schedule) throw new Error("Cuota no encontrada");

  const collected = amount != null && amount > 0 ? amount : Number(schedule.amount);
  const parent = schedule.document;

  // Cuota sobre una factura: el dinero se acredita en esa misma factura.
  if (parent.type === "FACTURA") {
    await prisma.paymentSchedule.update({
      where: { id: scheduleId },
      data: { status: "PAID", paidAt: new Date() },
    });
    await registerInvoicePayment(userId, parent.id, collected);
    return {
      invoiceId: parent.id,
      invoiceNumber: parent.number,
      invoiceCreated: false,
      amountCollected: collected,
    };
  }

  // Cuota sobre una cotización: no hay factura que respalde el cobro → se crea.
  const invoice = await createInvoiceForQuoteAmount(
    userId,
    parent,
    collected,
    schedule.description === QUOTE_BALANCE_SCHEDULE_DESC
      ? `Saldo de ${parent.number ?? "cotización"}`
      : schedule.description
  );

  await prisma.paymentSchedule.update({
    where: { id: scheduleId },
    data: { status: "PAID", paidAt: new Date(), invoiceId: invoice.id },
  });

  await registerInvoicePayment(userId, invoice.id, collected);
  await syncQuoteInvoiceBalance(parent.id, userId);

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    invoiceCreated: true,
    amountCollected: collected,
  };
}

/** Cobra una cotización sin factura: emite la factura por el monto y la salda. */
export async function collectQuoteWithInvoice(
  userId: string,
  quoteId: string,
  amount: number
): Promise<CollectResult> {
  const quote = await prisma.document.findFirst({
    where: { id: quoteId, userId, type: "COTIZACION" },
  });
  if (!quote) throw new Error("Cotización no encontrada");
  if (amount <= 0) throw new Error("El monto del pago debe ser mayor a cero");

  const invoice = await createInvoiceForQuoteAmount(
    userId,
    quote,
    amount,
    `Cobro de ${quote.number ?? "cotización"}`
  );

  await prisma.document.update({
    where: { id: quoteId },
    data: {
      linkedDocumentId: quote.linkedDocumentId ?? invoice.id,
      content: {
        ...((quote.content ?? {}) as Record<string, unknown>),
        linkedInvoiceId: quote.linkedDocumentId ?? invoice.id,
      },
    },
  });

  await registerInvoicePayment(userId, invoice.id, amount);
  await syncQuoteInvoiceBalance(quoteId, userId);

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    invoiceCreated: true,
    amountCollected: amount,
  };
}
