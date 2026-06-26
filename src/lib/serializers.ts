import type { PaymentMethod, Document } from "@prisma/client";

// Prisma Decimal cannot cross the Server→Client boundary in Next.js.
// These serialized types replace Decimal with number so they can be passed as props.

export type SerializedPaymentMethod = Omit<
  PaymentMethod,
  "commissionPct" | "commissionFlat" | "commissionTax"
> & {
  commissionPct: number;
  commissionFlat: number;
  commissionTax: number;
};

export type SerializedDocument = Omit<
  Document,
  "subtotal" | "taxAmount" | "total" | "commissionAmt" | "netAmount"
> & {
  subtotal: number | null;
  taxAmount: number | null;
  total: number | null;
  commissionAmt: number | null;
  netAmount: number | null;
};

export function serializePaymentMethod(pm: PaymentMethod): SerializedPaymentMethod {
  return {
    ...pm,
    commissionPct: Number(pm.commissionPct),
    commissionFlat: Number(pm.commissionFlat),
    commissionTax: Number(pm.commissionTax),
  };
}

export function serializeDocument(doc: Document): SerializedDocument {
  return {
    ...doc,
    subtotal: doc.subtotal != null ? Number(doc.subtotal) : null,
    taxAmount: doc.taxAmount != null ? Number(doc.taxAmount) : null,
    total: doc.total != null ? Number(doc.total) : null,
    commissionAmt: doc.commissionAmt != null ? Number(doc.commissionAmt) : null,
    netAmount: doc.netAmount != null ? Number(doc.netAmount) : null,
  };
}
