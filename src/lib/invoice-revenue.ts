/**
 * Fuente de verdad económica: facturas pagadas (PAID) o parcialmente pagadas
 * (PARTIALLY_PAID). Las cotizaciones aceptadas no cuentan como ingreso — evita
 * doble conteo con facturas vinculadas.
 */

export type InvoiceRevenueRow = {
  type: string;
  status: string;
  issueDate: Date;
  total: unknown;
  netAmount?: unknown | null;
  amountPaid?: unknown | null;
};

export function isPaidInvoice(doc: Pick<InvoiceRevenueRow, "type" | "status">): boolean {
  return doc.type === "FACTURA" && (doc.status === "PAID" || doc.status === "PARTIALLY_PAID");
}

export function filterPaidInvoices<T extends Pick<InvoiceRevenueRow, "type" | "status">>(
  documents: T[]
): T[] {
  return documents.filter(isPaidInvoice);
}

/**
 * Monto que realmente cuenta como ingreso recibido: el total completo si está
 * PAID, o solo lo efectivamente cobrado (`amountPaid`) si está PARTIALLY_PAID
 * — el saldo pendiente vive aparte como una cuota en Cuentas por Cobrar.
 */
export function effectiveInvoiceAmount(
  doc: Pick<InvoiceRevenueRow, "status" | "total" | "netAmount" | "amountPaid">
): { total: number; netAmount: number } {
  const total = Number(doc.total ?? 0);
  const netFull = Number(doc.netAmount ?? total);
  if (doc.status === "PARTIALLY_PAID") {
    const collected = Number(doc.amountPaid ?? 0);
    const netCollected = total > 0 ? netFull * (collected / total) : collected;
    return { total: collected, netAmount: netCollected };
  }
  return { total, netAmount: netFull };
}

export function sumInvoiceRevenue(
  documents: Pick<InvoiceRevenueRow, "status" | "total" | "netAmount" | "amountPaid">[]
): { gross: number; net: number; commission: number; count: number } {
  let gross = 0;
  let net = 0;
  for (const doc of documents) {
    const eff = effectiveInvoiceAmount(doc);
    gross += eff.total;
    net += eff.netAmount;
  }
  return { gross, net, commission: gross - net, count: documents.length };
}

/** Filtro Prisma reutilizable para consultas de ingresos. */
export function paidInvoiceWhere(userId: string) {
  return {
    userId,
    type: "FACTURA" as const,
    status: { in: ["PAID", "PARTIALLY_PAID"] as ("PAID" | "PARTIALLY_PAID")[] },
    total: { not: null },
  };
}

export const PAID_INVOICE_REVENUE_SELECT = {
  status: true,
  issueDate: true,
  total: true,
  netAmount: true,
  amountPaid: true,
} as const;
