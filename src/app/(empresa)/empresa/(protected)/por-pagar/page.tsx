import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { getLedgerEntries, getMonthlySummary } from "@/lib/ledger";
import { PorPagarClient, type SerializedExpense } from "./por-pagar-client";
import type { Expense } from "@prisma/client";
import { PageHeader } from "@/components/empresa/page-header";

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
    projectId: e.projectId,
    createdAt: e.createdAt.toISOString(),
  };
}

export default async function PorPagarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; proyecto?: string; nuevo?: string; titulo?: string }>;
}) {
  const user = await getEmpresaUser();
  const sp = await searchParams;
  const month = sp.month ?? new Date().toISOString().slice(0, 7);

  const [expenses, summary, ledgerEntries, proyectos] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: user.id },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    }),
    getMonthlySummary(user.id, month),
    getLedgerEntries(user.id, { month }),
    // Para elegir a qué proyecto va el gasto: primero los productos de la empresa interna.
    prisma.project.findMany({
      where: { userId: user.id, OR: [{ status: { in: ["ACTIVE", "PAUSED"] } }, ...(sp.proyecto ? [{ id: sp.proyecto }] : [])] },
      select: { id: true, name: true, client: { select: { internal: true } }, clients: { select: { client: { select: { internal: true } } } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const opciones = proyectos
    .map((p) => ({ id: p.id, name: p.name, interno: p.clients.some((c) => c.client.internal) || !!p.client?.internal }))
    .sort((a, b) => Number(b.interno) - Number(a.interno));
  // ?proyecto=<id>&nuevo=1 (desde la pestaña Dinero de un proyecto): formulario abierto con el proyecto elegido.
  const inicial = {
    projectId: opciones.some((p) => p.id === sp.proyecto) ? sp.proyecto! : "",
    abrir: sp.nuevo === "1",
    titulo: (sp.titulo ?? "").slice(0, 120),
  };

  return (
    <div className="w-full max-w-4xl">
      <PageHeader
        className="mb-6"
        title="Por pagar"
        description="Gastos mensuales, cuentas por pagar y libro contable simplificado."
      />
      <PorPagarClient
        initialExpenses={expenses.map(serializeExpense)}
        summary={summary}
        ledgerEntries={ledgerEntries}
        proyectos={opciones}
        inicial={inicial}
      />
    </div>
  );
}
