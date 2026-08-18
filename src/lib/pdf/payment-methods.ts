import type { Document as PrismaDocument, PaymentMethod } from "@prisma/client";

export type PdfPaymentMethod = {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
};

const BANK_TYPES = new Set(["BANK_TRANSFER", "CHECK"]);

function formatBankSubtitle(method: PaymentMethod): string | undefined {
  const lines = [
    method.accountNumber,
    [method.accountHolder, method.accountType ? `Cta. ${method.accountType}` : null]
      .filter(Boolean)
      .join(" · "),
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : undefined;
}

function formatCardSubtitle(method: PaymentMethod): string | undefined {
  if (method.accountNumber) return method.accountNumber;
  if (method.accountHolder) return method.accountHolder;
  return undefined;
}

/** Active payment methods formatted for PDF blocks. Empty → section hidden. */
export function buildPdfPaymentMethods(methods: PaymentMethod[]): PdfPaymentMethod[] {
  return methods
    .filter((m) => m.isActive)
    .flatMap((m): PdfPaymentMethod[] => {
      if (BANK_TYPES.has(m.type)) {
        if (!m.bankName && !m.accountNumber && !m.name) return [];
        return [
          {
            id: m.id,
            label: m.name || "Transferencia bancaria",
            title: m.bankName || m.name,
            subtitle: formatBankSubtitle(m),
          },
        ];
      }

      if (!m.name?.trim()) return [];
      return [
        {
          id: m.id,
          label: m.name,
          title: m.name,
          subtitle: formatCardSubtitle(m),
        },
      ];
    });
}

/** Payment methods to render on a document PDF — only user-selected ones, never the full config list. */
export function resolveDocumentPdfPaymentMethods(
  doc: PrismaDocument,
  allMethods: PaymentMethod[]
): PaymentMethod[] {
  if (doc.type === "FACTURA") {
    if (!doc.paymentMethodId) return [];
    const method = allMethods.find((m) => m.id === doc.paymentMethodId);
    return method ? [method] : [];
  }

  if (doc.type === "COTIZACION") {
    const content = doc.content as Record<string, unknown>;
    const ids = content?.pdfPaymentMethodIds;
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const idSet = new Set(ids.filter((id): id is string => typeof id === "string"));
    return allMethods.filter((m) => idSet.has(m.id));
  }

  return [];
}
