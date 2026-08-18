import type { Document, EmpresaUser, CompanyConfig } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncQuoteInvoiceBalance } from "@/lib/quote-balance";

export type EmpresaUserWithConfig = EmpresaUser & { config: CompanyConfig | null };

export function getQuoteLinkedInvoiceId(content: unknown): string | undefined {
  if (!content || typeof content !== "object") return undefined;
  const id = (content as Record<string, unknown>).linkedInvoiceId;
  return typeof id === "string" ? id : undefined;
}

export async function findInvoiceForQuote(
  userId: string,
  quoteId: string,
  quoteContent?: unknown
) {
  const linkedId = quoteContent ? getQuoteLinkedInvoiceId(quoteContent) : undefined;
  if (linkedId) {
    const byLink = await prisma.document.findFirst({
      where: { id: linkedId, userId, type: "FACTURA" },
    });
    if (byLink) return byLink;
  }

  return prisma.document.findFirst({
    where: {
      userId,
      type: "FACTURA",
      content: { path: ["sourceQuoteId"], equals: quoteId },
    },
  });
}

export async function createInvoiceFromQuote(
  quote: Document,
  user: EmpresaUserWithConfig
): Promise<Document> {
  const existing = await findInvoiceForQuote(quote.userId, quote.id, quote.content);
  if (existing) {
    const quoteContent = (quote.content ?? {}) as Record<string, unknown>;
    const needsUpdate = quoteContent.linkedInvoiceId !== existing.id || quote.linkedDocumentId !== existing.id;
    if (needsUpdate) {
      await prisma.document.update({
        where: { id: quote.id },
        data: { content: { ...quoteContent, linkedInvoiceId: existing.id }, linkedDocumentId: existing.id },
      });
    }
    await syncQuoteInvoiceBalance(quote.id, quote.userId);
    return existing;
  }

  if (quote.status !== "ACCEPTED") {
    throw new Error("Solo cotizaciones aceptadas pueden convertirse en factura");
  }

  const quoteContent = (quote.content ?? {}) as Record<string, unknown>;
  const paymentTermsDays = user.config?.paymentTermsDays ?? 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentTermsDays);

  const prefix = user.config?.invoicePrefix ?? "FAC";
  const year = new Date().getFullYear();
  const count = await prisma.document.count({
    where: { type: "FACTURA", userId: user.id },
  });
  const number = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

  const invoiceContent = {
    lineItems: quoteContent.lineItems ?? [],
    notes: quoteContent.notes ?? "",
    currency: quote.currency,
    sourceQuoteId: quote.id,
    sourceQuoteNumber: quote.number,
  };

  const invoice = await prisma.document.create({
    data: {
      type: "FACTURA",
      status: "DRAFT",
      number,
      title: quote.clientName
        ? `Factura — ${quote.clientName}`
        : quote.title || `Factura ${quote.number ?? ""}`.trim(),
      language: quote.language,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      clientCompany: quote.clientCompany,
      clientAddress: quote.clientAddress,
      clientRuc: quote.clientRuc,
      clientId: quote.clientId,
      content: invoiceContent,
      issueDate: new Date(),
      dueDate,
      subtotal: quote.subtotal ?? undefined,
      taxAmount: quote.taxAmount ?? undefined,
      total: quote.total ?? undefined,
      commissionAmt: quote.commissionAmt ?? undefined,
      netAmount: quote.netAmount ?? undefined,
      currency: quote.currency,
      paymentMethodId: quote.paymentMethodId,
      projectId: quote.projectId ?? undefined,
      contractId: quote.contractId ?? undefined,
      userId: user.id,
      companyId: user.configId ?? undefined,
      linkedDocumentId: quote.id,
    },
  });

  // Enlazar la cotización a la factura (JSON para compat + FK para queries)
  await prisma.document.update({
    where: { id: quote.id },
    data: {
      content: { ...quoteContent, linkedInvoiceId: invoice.id },
      linkedDocumentId: invoice.id,
    },
  });

  return invoice;
}
