import { filterPaidInvoices, sumInvoiceRevenue } from "@/lib/invoice-revenue";

export type ClientDocumentSummary = {
  type: string;
  status: string;
  total: unknown;
  netAmount: unknown;
};

export function computeClientStats(documents: ClientDocumentSummary[]) {
  const quotes = documents.filter((d) => d.type === "COTIZACION");
  const invoices = documents.filter((d) => d.type === "FACTURA");
  const acceptedQuotes = quotes.filter((d) => d.status === "ACCEPTED");
  const paidInvoices = filterPaidInvoices(documents);
  const revenue = sumInvoiceRevenue(paidInvoices);

  return {
    totalQuotes: quotes.length,
    acceptedQuotes: acceptedQuotes.length,
    quoteAcceptanceRate:
      quotes.length > 0
        ? Math.round((acceptedQuotes.length / quotes.length) * 100)
        : 0,
    totalInvoices: invoices.length,
    paidInvoices: paidInvoices.length,
    gross: revenue.gross,
    net: revenue.net,
  };
}
