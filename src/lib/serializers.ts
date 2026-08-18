import type { PaymentMethod, Document, Project, Contract, PaymentSchedule, Lead, CompanyConfig } from "@prisma/client";

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
  | "subtotal"
  | "taxAmount"
  | "total"
  | "commissionAmt"
  | "netAmount"
  | "issueDate"
  | "dueDate"
  | "validUntil"
  | "sentAt"
  | "createdAt"
  | "updatedAt"
> & {
  subtotal: number | null;
  taxAmount: number | null;
  total: number | null;
  commissionAmt: number | null;
  netAmount: number | null;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializePaymentMethod(pm: PaymentMethod): SerializedPaymentMethod {
  return {
    ...pm,
    commissionPct: Number(pm.commissionPct),
    commissionFlat: Number(pm.commissionFlat),
    commissionTax: Number(pm.commissionTax),
  };
}

export type SerializedCompanyConfig = Omit<
  CompanyConfig,
  "taxRatePercent" | "createdAt" | "updatedAt"
> & {
  taxRatePercent: number;
  createdAt: string;
  updatedAt: string;
};

export function serializeCompanyConfig(
  config: CompanyConfig | null
): SerializedCompanyConfig | null {
  if (!config) return null;
  return {
    ...config,
    taxRatePercent: Number(config.taxRatePercent),
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export type SerializedProject = Omit<Project, "totalBudget" | "startDate" | "endDate" | "createdAt" | "updatedAt"> & {
  totalBudget: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeProject(p: Project): SerializedProject {
  return {
    ...p,
    totalBudget: p.totalBudget != null ? Number(p.totalBudget) : null,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export type SerializedContract = Omit<Contract, "value" | "signedAt" | "startsAt" | "endsAt" | "createdAt" | "updatedAt"> & {
  value: number | null;
  signedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeContract(c: Contract): SerializedContract {
  return {
    ...c,
    value: c.value != null ? Number(c.value) : null,
    signedAt: c.signedAt?.toISOString() ?? null,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export type SerializedSchedule = Omit<PaymentSchedule, "amount" | "dueDate" | "paidAt" | "createdAt"> & {
  amount: number;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
};

export function serializeSchedule(s: PaymentSchedule): SerializedSchedule {
  return {
    ...s,
    amount: Number(s.amount),
    dueDate: s.dueDate.toISOString(),
    paidAt: s.paidAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export type SerializedLead = Omit<
  Lead,
  "estimatedValue" | "nextFollowUpAt" | "convertedAt" | "createdAt" | "updatedAt"
> & {
  estimatedValue: number | null;
  nextFollowUpAt: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeLead(l: Lead): SerializedLead {
  return {
    ...l,
    estimatedValue: l.estimatedValue != null ? Number(l.estimatedValue) : null,
    nextFollowUpAt: l.nextFollowUpAt?.toISOString() ?? null,
    convertedAt: l.convertedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

export function serializeDocument(doc: Document): SerializedDocument {
  return {
    ...doc,
    issueDate: doc.issueDate.toISOString(),
    dueDate: doc.dueDate?.toISOString() ?? null,
    validUntil: doc.validUntil?.toISOString() ?? null,
    sentAt: doc.sentAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    subtotal: doc.subtotal != null ? Number(doc.subtotal) : null,
    taxAmount: doc.taxAmount != null ? Number(doc.taxAmount) : null,
    total: doc.total != null ? Number(doc.total) : null,
    commissionAmt: doc.commissionAmt != null ? Number(doc.commissionAmt) : null,
    netAmount: doc.netAmount != null ? Number(doc.netAmount) : null,
  };
}
