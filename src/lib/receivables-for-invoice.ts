import { prisma } from "@/lib/prisma";
import { QUOTE_BALANCE_SCHEDULE_DESC, INVOICE_PARTIAL_SCHEDULE_DESC } from "@/lib/quote-balance";

export type ReceivableForInvoice = {
  id: string;
  kind: "schedule" | "document";
  label: string;
  clientName: string | null;
  clientCompany: string | null;
  clientId: string | null;
  amount: number;
  dueDate: string | null;
  documentId: string;
  documentType: "FACTURA" | "COTIZACION";
  quoteId: string | null;
  paymentScheduleId: string | null;
  projectId: string | null;
};

export async function getReceivablesForInvoice(userId: string): Promise<ReceivableForInvoice[]> {
  const [schedules, pendingDocs] = await Promise.all([
    prisma.paymentSchedule.findMany({
      where: {
        userId,
        status: { in: ["PENDING", "OVERDUE"] },
        invoiceId: null,
      },
      include: {
        document: {
          select: {
            id: true,
            type: true,
            number: true,
            clientName: true,
            clientCompany: true,
            clientId: true,
            projectId: true,
            linkedDocumentId: true,
            content: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.document.findMany({
      where: {
        userId,
        total: { gt: 0 },
        OR: [
          {
            type: "COTIZACION",
            status: { in: ["SENT", "ACCEPTED"] },
            linkedDocumentId: null,
          },
          {
            type: "FACTURA",
            status: "DRAFT",
          },
        ],
      },
      select: {
        id: true,
        type: true,
        number: true,
        clientName: true,
        clientCompany: true,
        clientId: true,
        projectId: true,
        total: true,
        dueDate: true,
        content: true,
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const items: ReceivableForInvoice[] = [];

  for (const sc of schedules) {
    const doc = sc.document;
    const quoteId =
      doc.type === "COTIZACION"
        ? doc.id
        : (doc.content as Record<string, unknown> | null)?.sourceQuoteId
          ? String((doc.content as Record<string, unknown>).sourceQuoteId)
          : doc.linkedDocumentId;

    items.push({
      id: sc.id,
      kind: "schedule",
      label: `${doc.number ?? doc.type} — ${sc.description}`,
      clientName: doc.clientName,
      clientCompany: doc.clientCompany,
      clientId: doc.clientId,
      amount: Number(sc.amount),
      dueDate: sc.dueDate.toISOString(),
      documentId: doc.id,
      documentType: doc.type as "FACTURA" | "COTIZACION",
      quoteId: typeof quoteId === "string" ? quoteId : null,
      paymentScheduleId: sc.id,
      projectId: doc.projectId,
    });
  }

  for (const doc of pendingDocs) {
    const content = doc.content as Record<string, unknown> | null;
    if (doc.type === "COTIZACION") {
      if (content?.linkedInvoiceId) continue;
      items.push({
        id: doc.id,
        kind: "document",
        label: doc.number ?? "COTIZACION",
        clientName: doc.clientName,
        clientCompany: doc.clientCompany,
        clientId: doc.clientId,
        amount: Number(doc.total ?? 0),
        dueDate: doc.dueDate?.toISOString() ?? null,
        documentId: doc.id,
        documentType: "COTIZACION",
        quoteId: doc.id,
        paymentScheduleId: null,
        projectId: doc.projectId,
      });
      continue;
    }

    const sourceQuoteId = content?.sourceQuoteId;
    items.push({
      id: doc.id,
      kind: "document",
      label: doc.number ? `${doc.number} — Borrador` : "Factura borrador",
      clientName: doc.clientName,
      clientCompany: doc.clientCompany,
      clientId: doc.clientId,
      amount: Number(doc.total ?? 0),
      dueDate: doc.dueDate?.toISOString() ?? null,
      documentId: doc.id,
      documentType: "FACTURA",
      quoteId: typeof sourceQuoteId === "string" ? sourceQuoteId : null,
      paymentScheduleId: null,
      projectId: doc.projectId,
    });
  }

  return items.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export function isQuoteBalanceSchedule(description: string): boolean {
  return description === QUOTE_BALANCE_SCHEDULE_DESC || description === INVOICE_PARTIAL_SCHEDULE_DESC;
}
