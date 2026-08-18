"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExpenseCategory, ExpenseStatus } from "@prisma/client";
import {
  EXPENSE_CATEGORIES,
  fmtUSD,
  getCategoryLabel,
  type LedgerEntry,
  type MonthlySummary,
} from "@/lib/ledger";

export type SerializedExpense = {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: string;
  currency: string;
  dueDate: string | null;
  paidAt: string | null;
  status: ExpenseStatus;
  isRecurring: boolean;
  vendor: string | null;
  notes: string | null;
  createdAt: string;
};

interface PorPagarClientProps {
  initialExpenses: SerializedExpense[];
  summary: MonthlySummary;
  ledgerEntries: LedgerEntry[];
}

type Tab = "gastos" | "libro";
type StatusFilter = "ALL" | ExpenseStatus;

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};

const TYPE_STYLE: Record<LedgerEntry["type"], string> = {
  INGRESO: "border-green-500/25 bg-green-500/[0.06] text-green-400",
  EGRESO: "border-red-500/25 bg-red-500/[0.06] text-red-400",
  PENDIENTE: "border-amber-500/25 bg-amber-500/[0.06] text-amber-400",
};

export function PorPagarClient({
  initialExpenses,
  summary: initialSummary,
  ledgerEntries: initialLedger,
}: PorPagarClientProps) {
  const router = useRouter();
  const expenses = initialExpenses;
  const summary = initialSummary;
  const ledger = initialLedger;
  const [tab, setTab] = useState<Tab>("gastos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "OTRO" as ExpenseCategory,
    dueDate: "",
    vendor: "",
    isRecurring: false,
    notes: "",
  });

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return expenses;
    return expenses.filter((e) => e.status === statusFilter);
  }, [expenses, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, SerializedExpense[]>();
    for (const e of filtered) {
      const key = e.dueDate?.slice(0, 7) ?? e.createdAt.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // El resumen mensual y el libro se calculan en el servidor: sin router.refresh()
  // los KPIs quedan desfasados apenas se paga o se crea un gasto.
  function refreshData() {
    router.refresh();
  }

  async function createExpense() {
    if (!form.title.trim() || !form.amount) return;
    setBusy(true);
    try {
      const res = await fetch("/api/empresa/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          amount: Number(form.amount),
          category: form.category,
          dueDate: form.dueDate || null,
          vendor: form.vendor || null,
          isRecurring: form.isRecurring,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) return;
      setForm({ title: "", amount: "", category: "OTRO", dueDate: "", vendor: "", isRecurring: false, notes: "" });
      setShowForm(false);
      refreshData();
    } finally {
      setBusy(false);
    }
  }

  async function togglePaid(exp: SerializedExpense) {
    const nextStatus: ExpenseStatus = exp.status === "PAID" ? "PENDING" : "PAID";
    setBusy(true);
    try {
      const res = await fetch(`/api/empresa/expenses/${exp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) return;
      refreshData();
    } finally {
      setBusy(false);
    }
  }

  async function removeExpense(id: string) {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/empresa/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      refreshData();
    } finally {
      setBusy(false);
    }
  }

  let runningBalance = 0;
  const ledgerWithBalance = ledger.map((entry) => {
    runningBalance += entry.debit - entry.credit;
    return { ...entry, balance: runningBalance };
  });

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Ingresos (mes)", value: summary.ingresos, color: "text-green-400" },
          { label: "Por pagar", value: summary.gastosPendientes, color: "text-amber-400" },
          { label: "Pagado (mes)", value: summary.gastosPagados, color: "text-red-400" },
          { label: "Neto", value: summary.neto, color: summary.neto >= 0 ? "text-[#1AA7F0]" : "text-red-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-4">
            <p className="text-white/45 text-xs uppercase tracking-wider">{kpi.label}</p>
            <p className={`text-lg font-semibold font-mono mt-1 ${kpi.color}`}>
              ${fmtUSD(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-2">
        {(["gastos", "libro"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              tab === t
                ? "bg-[#1AA7F0]/10 text-[#1AA7F0] border border-[#1AA7F0]/20"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {t === "gastos" ? "Gastos" : "Libro"}
          </button>
        ))}
      </div>

      {tab === "gastos" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              {(["ALL", "PENDING", "PAID"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    statusFilter === f
                      ? "bg-white/10 border-white/20 text-white"
                      : "border-white/[0.08] text-white/45 hover:text-white/70"
                  }`}
                >
                  {f === "ALL" ? "Todos" : STATUS_LABEL[f]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-medium rounded-lg"
            >
              + Gasto
            </button>
          </div>

          {showForm && (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Título (ej. Vercel Pro)"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="bg-[#0a0a10] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monto USD"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="bg-[#0a0a10] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
                  className="bg-[#0a0a10] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{getCategoryLabel(c)}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="bg-[#0a0a10] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
                />
                <input
                  placeholder="Proveedor (opcional)"
                  value={form.vendor}
                  onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                  className="bg-[#0a0a10] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white sm:col-span-2"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-white/60">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
                />
                Gasto recurrente (mensual)
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={createExpense}
                className="px-4 py-2 bg-green-600/80 hover:bg-green-600 text-white text-sm rounded-lg disabled:opacity-50"
              >
                Guardar gasto
              </button>
            </div>
          )}

          {grouped.length === 0 ? (
            <p className="text-white/45 text-sm text-center py-12">Sin gastos registrados.</p>
          ) : (
            grouped.map(([monthKey, items]) => (
              <div key={monthKey}>
                <h3 className="text-white/50 text-xs uppercase tracking-widest mb-2">
                  {new Date(monthKey + "-01").toLocaleDateString("es-PA", { month: "long", year: "numeric" })}
                </h3>
                <div className="space-y-2">
                  {items.map((exp) => (
                    <div
                      key={exp.id}
                      className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium text-sm">{exp.title}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/55 border border-white/[0.08]">
                            {getCategoryLabel(exp.category)}
                          </span>
                          {exp.isRecurring && (
                            <span className="text-[10px] text-[#1AA7F0]">↻ recurrente</span>
                          )}
                        </div>
                        {exp.vendor && <p className="text-white/45 text-xs mt-0.5">{exp.vendor}</p>}
                        {exp.dueDate && (
                          <p className="text-white/40 text-xs mt-1">
                            Vence: {new Date(exp.dueDate).toLocaleDateString("es-PA")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-white font-mono text-sm">${fmtUSD(Number(exp.amount))}</p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => togglePaid(exp)}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            exp.status === "PAID"
                              ? "bg-green-500/10 border-green-500/25 text-green-400"
                              : "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20"
                          }`}
                        >
                          {exp.status === "PAID" ? "✓ Pagado" : "Marcar pagado"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExpense(exp.id)}
                          className="text-white/35 hover:text-red-400 text-sm px-1"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "libro" && (
        <div className="space-y-2">
          {ledgerWithBalance.length === 0 ? (
            <p className="text-white/45 text-sm text-center py-12">Sin movimientos este mes.</p>
          ) : (
            ledgerWithBalance.map((entry) => (
              <div
                key={entry.id}
                className={`border rounded-xl p-4 ${TYPE_STYLE[entry.type]}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-sm font-medium">{entry.concept}</p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {new Date(entry.date).toLocaleDateString("es-PA")}
                      {entry.category ? ` · ${entry.category}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider opacity-80">{entry.type}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-mono">
                  <div>
                    <span className="opacity-60">Débito</span>
                    <p>{entry.debit > 0 ? `$${fmtUSD(entry.debit)}` : "—"}</p>
                  </div>
                  <div>
                    <span className="opacity-60">Crédito</span>
                    <p>{entry.credit > 0 ? `$${fmtUSD(entry.credit)}` : "—"}</p>
                  </div>
                  <div className="text-right">
                    <span className="opacity-60">Saldo</span>
                    <p>${fmtUSD(entry.balance)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
