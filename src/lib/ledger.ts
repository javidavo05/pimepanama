import { prisma } from "@/lib/prisma";
import { paidInvoiceWhere, PAID_INVOICE_REVENUE_SELECT, effectiveInvoiceAmount } from "@/lib/invoice-revenue";
import type { ExpenseCategory, ExpenseStatus } from "@prisma/client";

export type LedgerEntryType = "INGRESO" | "EGRESO" | "PENDIENTE";

export type LedgerEntry = {
  id: string;
  date: string;
  concept: string;
  type: LedgerEntryType;
  debit: number;
  credit: number;
  category?: string;
  reference?: string;
};

export type MonthlySummary = {
  ingresos: number;
  gastosPagados: number;
  gastosPendientes: number;
  neto: number;
};

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  HOSTING: "Hosting",
  SAAS: "SaaS",
  SALARIOS: "Salarios",
  SERVICIOS: "Servicios",
  MARKETING: "Marketing",
  IMPUESTOS: "Impuestos",
  COMISIONES: "Comisiones",
  SOFTWARE: "Software",
  OTRO: "Otro",
};

function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
}

export function getCategoryLabel(cat: ExpenseCategory): string {
  return CATEGORY_LABEL[cat] ?? cat;
}

export async function getLedgerEntries(
  userId: string,
  opts: { month?: string } = {}
): Promise<LedgerEntry[]> {
  const month = opts.month ?? new Date().toISOString().slice(0, 7);
  const { start, end } = monthRange(month);

  const [invoices, expenses] = await Promise.all([
    prisma.document.findMany({
      where: {
        ...paidInvoiceWhere(userId),
        issueDate: { gte: start, lte: end },
      },
      select: {
        id: true,
        number: true,
        title: true,
        clientName: true,
        ...PAID_INVOICE_REVENUE_SELECT,
      },
      orderBy: { issueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        OR: [
          { paidAt: { gte: start, lte: end } },
          { status: "PENDING", dueDate: { gte: start, lte: end } },
          { status: "PENDING", dueDate: null, createdAt: { gte: start, lte: end } },
        ],
      },
      orderBy: [{ paidAt: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const entries: LedgerEntry[] = [];

  for (const inv of invoices) {
    const amount = effectiveInvoiceAmount(inv).total;
    entries.push({
      id: `inv-${inv.id}`,
      date: inv.issueDate.toISOString(),
      concept: `Factura ${inv.number ?? ""} — ${inv.clientName ?? inv.title}`.trim(),
      type: "INGRESO",
      debit: amount,
      credit: 0,
      reference: inv.id,
    });
  }

  for (const exp of expenses) {
    const amount = Number(exp.amount);
    const date =
      exp.status === "PAID" && exp.paidAt
        ? exp.paidAt
        : exp.dueDate ?? exp.createdAt;
    const isPaid = exp.status === "PAID";
    entries.push({
      id: `exp-${exp.id}`,
      date: date.toISOString(),
      concept: `${exp.title}${exp.vendor ? ` (${exp.vendor})` : ""}`,
      type: isPaid ? "EGRESO" : "PENDIENTE",
      debit: 0,
      credit: amount,
      category: getCategoryLabel(exp.category),
      reference: exp.id,
    });
  }

  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return entries;
}

export async function getMonthlySummary(userId: string, month: string): Promise<MonthlySummary> {
  const { start, end } = monthRange(month);

  const [invoices, paidExpenses, pendingExpenses] = await Promise.all([
    prisma.document.findMany({
      where: {
        ...paidInvoiceWhere(userId),
        issueDate: { gte: start, lte: end },
      },
      select: { status: true, total: true, amountPaid: true },
    }),
    prisma.expense.findMany({
      where: { userId, status: "PAID", paidAt: { gte: start, lte: end } },
      select: { amount: true },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        status: "PENDING",
        OR: [
          { dueDate: { gte: start, lte: end } },
          { dueDate: null, createdAt: { gte: start, lte: end } },
        ],
      },
      select: { amount: true },
    }),
  ]);

  const ingresos = invoices.reduce((s, d) => s + effectiveInvoiceAmount(d).total, 0);
  const gastosPagados = paidExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const gastosPendientes = pendingExpenses.reduce((s, e) => s + Number(e.amount), 0);

  return {
    ingresos,
    gastosPagados,
    gastosPendientes,
    neto: ingresos - gastosPagados,
  };
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "HOSTING", "SAAS", "SALARIOS", "SERVICIOS", "MARKETING",
  "IMPUESTOS", "COMISIONES", "SOFTWARE", "OTRO",
];

export const EXPENSE_STATUSES: ExpenseStatus[] = ["PENDING", "PAID", "CANCELLED"];

export function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
