/**
 * Fuente de verdad económica: solo facturas pagadas (FACTURA + PAID).
 * Las cotizaciones aceptadas no cuentan como ingreso — evita doble conteo con facturas vinculadas.
 */

export type InvoiceRevenueRow = {
  type: string;
  status: string;
  issueDate: Date;
  total: unknown;
  netAmount?: unknown | null;
};

export function isPaidInvoice(doc: Pick<InvoiceRevenueRow, "type" | "status">): boolean {
  return doc.type === "FACTURA" && doc.status === "PAID";
}

export function filterPaidInvoices<T extends Pick<InvoiceRevenueRow, "type" | "status">>(
  documents: T[]
): T[] {
  return documents.filter(isPaidInvoice);
}

export function sumInvoiceRevenue(
  documents: Pick<InvoiceRevenueRow, "total" | "netAmount">[]
): { gross: number; net: number; commission: number; count: number } {
  let gross = 0;
  let net = 0;
  for (const doc of documents) {
    gross += Number(doc.total ?? 0);
    net += Number(doc.netAmount ?? doc.total ?? 0);
  }
  return { gross, net, commission: gross - net, count: documents.length };
}

/** Filtro Prisma reutilizable para consultas de ingresos. */
export function paidInvoiceWhere(userId: string) {
  return {
    userId,
    type: "FACTURA" as const,
    status: "PAID" as const,
    total: { not: null },
  };
}

export const PAID_INVOICE_REVENUE_SELECT = {
  issueDate: true,
  total: true,
  netAmount: true,
} as const;
