import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { getLedgerEntries, getMonthlySummary } from "@/lib/ledger";
import { PorPagarClient, type SerializedExpense } from "./por-pagar-client";
import type { Expense } from "@prisma/client";

export const metadata = { title: "Por pagar — Pime Suite" };
export const dynamic = "force-dynamic";

function serializeExpense(e: Expense): SerializedExpense {
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    amount: String(e.amount),
    currency: e.currency,
    dueDate: e.dueDate?.toISOString() ?? null,
    paidAt: e.paidAt?.toISOString() ?? null,
    status: e.status,
    isRecurring: e.isRecurring,
    vendor: e.vendor,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
  };
}

export default async function PorPagarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getEmpresaUser();
  const sp = await searchParams;
  const month = sp.month ?? new Date().toISOString().slice(0, 7);

  const [expenses, summary, ledgerEntries] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: user.id },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    }),
    getMonthlySummary(user.id, month),
    getLedgerEntries(user.id, { month }),
  ]);

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-white text-xl font-semibold tracking-tight">Por pagar</h1>
        <p className="text-white/50 text-sm mt-1">
          Gastos mensuales, cuentas por pagar y libro contable simplificado.
        </p>
      </div>
      <PorPagarClient
        initialExpenses={expenses.map(serializeExpense)}
        summary={summary}
        ledgerEntries={ledgerEntries}
      />
    </div>
  );
}
