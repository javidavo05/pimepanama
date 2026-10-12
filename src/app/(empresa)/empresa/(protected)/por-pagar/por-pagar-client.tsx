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
import { btn, seg } from "@/components/empresa/page-header";
import { sugerirGasto } from "@/lib/gastos/sugerir";

const CAMPO = "w-full min-w-0 min-h-11 bg-panel border border-line-mid rounded-lg px-3 py-2 text-base sm:text-sm text-fg focus:outline-none focus:border-brand";

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
  projectId: string | null;
  createdAt: string;
};

type ProyectoOpcion = { id: string; name: string; interno: boolean };

interface PorPagarClientProps {
  initialExpenses: SerializedExpense[];
  summary: MonthlySummary;
  ledgerEntries: LedgerEntry[];
  proyectos: ProyectoOpcion[];
  /** Precarga desde un proyecto: ?proyecto=<id>&nuevo=1&titulo=… */
  inicial?: { projectId: string; abrir: boolean; titulo: string };
}

type Tab = "gastos" | "libro";
type StatusFilter = "ALL" | ExpenseStatus;

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};

const TYPE_STYLE: Record<LedgerEntry["type"], string> = {
  INGRESO: "border-ok/25 bg-ok/[0.06] text-ok",
  EGRESO: "border-danger/25 bg-danger/[0.06] text-danger",
  PENDIENTE: "border-warn/25 bg-warn/[0.06] text-warn",
};

export function PorPagarClient({
  initialExpenses,
  summary: initialSummary,
  ledgerEntries: initialLedger,
  proyectos,
  inicial,
}: PorPagarClientProps) {
  const router = useRouter();
  const expenses = initialExpenses;
  const summary = initialSummary;
  const ledger = initialLedger;
  const [tab, setTab] = useState<Tab>("gastos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [showForm, setShowForm] = useState(!!inicial?.abrir);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nombreProyecto = useMemo(() => new Map(proyectos.map((p) => [p.id, p.name])), [proyectos]);

  const vacio = () => {
    const titulo = inicial?.titulo ?? "";
    const s = sugerirGasto(titulo);
    return {
      title: titulo,
      amount: "",
      category: (s?.category ?? "OTRO") as ExpenseCategory,
      dueDate: "",
      vendor: s?.vendor ?? "",
      isRecurring: false,
      notes: "",
      projectId: inicial?.projectId ?? "",
    };
  };
  const [form, setForm] = useState(vacio);
  // Categoría y proveedor se sugieren por el título mientras no se hayan tocado a mano.
  const [tocado, setTocado] = useState({ category: false, vendor: false });

  function cambiarTitulo(title: string) {
    const s = sugerirGasto(title);
    setForm((f) => ({
      ...f,
      title,
      ...(s && !tocado.category ? { category: s.category as ExpenseCategory } : {}),
      ...(s?.vendor && !tocado.vendor ? { vendor: s.vendor } : {}),
    }));
  }

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
    if (!form.title.trim() || !form.amount) {
      setError("Escribe qué es y el monto.");
      return;
    }
    setError(null);
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
          projectId: form.projectId || null,
        }),
      });
      if (!res.ok) {
        setError("No se pudo guardar el gasto. Revisa la conexión y vuelve a intentar.");
        return;
      }
      setForm({ ...vacio(), title: "", projectId: form.projectId });
      setTocado({ category: false, vendor: false });
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
          { label: "Ingresos (mes)", value: summary.ingresos, color: "text-ok" },
          { label: "Por pagar", value: summary.gastosPendientes, color: "text-warn" },
          { label: "Pagado (mes)", value: summary.gastosPagados, color: "text-danger" },
          { label: "Neto", value: summary.neto, color: summary.neto >= 0 ? "text-brand-fg" : "text-danger" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-panel border border-line rounded-xl p-4">
            <p className="text-fg-faint text-xs uppercase tracking-wider">{kpi.label}</p>
            <p className={`text-lg font-semibold font-mono mt-1 ${kpi.color}`}>
              ${fmtUSD(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className={seg.group} role="tablist" aria-label="Vista">
        {(["gastos", "libro"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={seg.item(tab === t)}
          >
            {t === "gastos" ? "Gastos" : "Libro"}
          </button>
        ))}
      </div>

      {tab === "gastos" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
            {/* Con el formulario abierto, su «Guardar» es la acción principal: este botón pasa a cerrarlo. */}
            <button type="button" onClick={() => setShowForm((v) => !v)} aria-expanded={showForm} className={showForm ? btn.secondary : btn.primary}>
              {showForm ? "Cerrar formulario" : "+ Gasto"}
            </button>
            <div className={seg.group} aria-label="Filtrar por estado">
              {(["ALL", "PENDING", "PAID"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={statusFilter === f}
                  onClick={() => setStatusFilter(f)}
                  className={seg.item(statusFilter === f)}
                >
                  {f === "ALL" ? "Todos" : STATUS_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          {showForm && (
            <div className="bg-fill border border-line rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="sm:col-span-2 block">
                  <span className="block text-fg-dim text-xs mb-1">Proyecto</span>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                    className={`${CAMPO} field-select pr-8`}
                  >
                    <option value="">Gasto general de la empresa</option>
                    {proyectos.some((x) => x.interno) && (
                      <optgroup label="Productos de Pime">
                        {proyectos.filter((x) => x.interno).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </optgroup>
                    )}
                    {proyectos.some((x) => !x.interno) && (
                      <optgroup label="Proyectos de clientes">
                        {proyectos.filter((x) => !x.interno).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-fg-dim text-xs mb-1">Qué es</span>
                  <input
                    placeholder="Vercel Pro, dominio, Supabase…"
                    value={form.title}
                    onChange={(e) => cambiarTitulo(e.target.value)}
                    className={CAMPO}
                  />
                </label>
                <label className="block">
                  <span className="block text-fg-dim text-xs mb-1">Monto en USD</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className={CAMPO}
                  />
                </label>
                <label className="block">
                  <span className="block text-fg-dim text-xs mb-1">Categoría</span>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      setTocado((t) => ({ ...t, category: true }));
                      setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }));
                    }}
                    className={`${CAMPO} field-select pr-8`}
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{getCategoryLabel(c)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-fg-dim text-xs mb-1">Vence o se pagó</span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className={CAMPO}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="block text-fg-dim text-xs mb-1">Proveedor</span>
                  <input
                    placeholder="Opcional"
                    value={form.vendor}
                    onChange={(e) => {
                      setTocado((t) => ({ ...t, vendor: true }));
                      setForm((f) => ({ ...f, vendor: e.target.value }));
                    }}
                    className={CAMPO}
                  />
                </label>
              </div>
              <label className="flex items-center gap-3 min-h-11 text-sm text-fg-dim">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
                  className="h-5 w-5"
                />
                Se paga cada mes
              </label>
              {error && <p className="text-danger text-sm" role="alert">{error}</p>}
              <button type="button" disabled={busy} onClick={createExpense} className={btn.primary}>
                {busy ? "Guardando…" : form.projectId ? `Guardar gasto de ${nombreProyecto.get(form.projectId) ?? "este proyecto"}` : "Guardar gasto"}
              </button>
            </div>
          )}

          {grouped.length === 0 ? (
            <div className="bg-panel border border-line rounded-2xl px-6 py-12 text-center">
              <p className="text-fg-mute font-medium">{statusFilter === "ALL" ? "Todavía no hay gastos" : statusFilter === "PENDING" ? "Nada pendiente de pagar" : "Ningún gasto pagado todavía"}</p>
              <p className="text-fg-dim text-sm mt-1 max-w-md mx-auto">Anota lo que cuesta cada producto —hosting, base de datos, dominios, herramientas— y cada proyecto muestra cuánto gasta al mes y al año.</p>
              {!showForm && (
                <button type="button" onClick={() => setShowForm(true)} className={`${btn.secondary} mt-6`}>
                  Registrar el primer gasto
                </button>
              )}
            </div>
          ) : (
            grouped.map(([monthKey, items]) => (
              <div key={monthKey}>
                <h3 className="text-fg-faint text-xs uppercase tracking-widest mb-2">
                  {new Date(monthKey + "-01").toLocaleDateString("es-PA", { month: "long", year: "numeric" })}
                </h3>
                <div className="space-y-2">
                  {items.map((exp) => (
                    <div
                      key={exp.id}
                      className="bg-panel border border-line rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-fg font-medium text-sm">{exp.title}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-fill-2 text-fg-dim border border-line">
                            {getCategoryLabel(exp.category)}
                          </span>
                          {exp.isRecurring && (
                            <span className="text-[10px] text-brand-fg">↻ recurrente</span>
                          )}
                          {exp.projectId && nombreProyecto.get(exp.projectId) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand-fg">{nombreProyecto.get(exp.projectId)}</span>
                          )}
                        </div>
                        {exp.vendor && <p className="text-fg-faint text-xs mt-0.5">{exp.vendor}</p>}
                        {exp.dueDate && (
                          <p className="text-fg-ghost text-xs mt-1">
                            Vence: {new Date(exp.dueDate).toLocaleDateString("es-PA")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-fg font-mono text-sm">${fmtUSD(Number(exp.amount))}</p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => togglePaid(exp)}
                          className={`min-h-11 sm:min-h-9 px-3 text-xs rounded-lg border transition-colors ${
                            exp.status === "PAID"
                              ? "bg-ok/10 border-ok/25 text-ok"
                              : "bg-warn/10 border-warn/25 text-warn hover:bg-warn/20"
                          }`}
                        >
                          {exp.status === "PAID" ? "✓ Pagado" : "Marcar pagado"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExpense(exp.id)}
                          aria-label={`Eliminar ${exp.title}`}
                          className="inline-flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-lg text-fg-ghost hover:text-danger text-sm"
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
            <p className="text-fg-faint text-sm text-center py-12">Sin movimientos este mes.</p>
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
