"use client";

import type { ReceivableForInvoice } from "@/lib/receivables-for-invoice";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

interface ReceivablesInvoicePanelProps {
  items: ReceivableForInvoice[];
  selectedId: string | null;
  onSelect: (item: ReceivableForInvoice) => void;
  onClear: () => void;
  language?: "es" | "en";
}

export function ReceivablesInvoicePanel({
  items,
  selectedId,
  onSelect,
  onClear,
  language = "es",
}: ReceivablesInvoicePanelProps) {
  const isEs = language === "es";

  if (items.length === 0) return null;

  return (
    <div className="bg-panel border border-brand/20 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-brand-fg text-xs uppercase tracking-widest font-medium">
            {isEs ? "Cuentas por cobrar" : "Accounts receivable"}
          </h3>
          <p className="text-fg-dim text-xs mt-1">
            {isEs
              ? "Selecciona un saldo pendiente para prellenar esta factura."
              : "Select a pending balance to prefill this invoice."}
          </p>
        </div>
        {selectedId && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-fg-faint hover:text-fg-mute px-2 py-1 shrink-0"
          >
            {isEs ? "Limpiar" : "Clear"}
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {items.map((item) => {
          const selected = selectedId === item.id;
          const client = [item.clientName, item.clientCompany].filter(Boolean).join(" — ");
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                selected
                  ? "border-brand/40 bg-brand/[0.06]"
                  : "border-line bg-fill hover:border-line-mid"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-fg-soft text-xs font-mono truncate">{item.label}</p>
                <p className="text-fg-faint text-[11px] truncate mt-0.5">{client || "—"}</p>
                <p className="text-fg-ghost text-[10px] mt-0.5">
                  {item.kind === "schedule"
                    ? isEs
                      ? "Cuota"
                      : "Installment"
                    : item.documentType === "FACTURA"
                      ? isEs
                        ? "Factura borrador"
                        : "Draft invoice"
                      : isEs
                        ? "Cotización"
                        : "Quote"}
                  {item.dueDate ? ` · ${isEs ? "vence" : "due"} ${fmtDate(item.dueDate)}` : ""}
                </p>
              </div>
              <p className="text-fg-mute font-mono text-sm shrink-0">${fmt(item.amount)}</p>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selected
                    ? "bg-brand text-on-brand"
                    : "bg-sand/15 border border-sand/30 text-sand-fg hover:bg-sand/25"
                }`}
              >
                {selected
                  ? isEs
                    ? "Seleccionado"
                    : "Selected"
                  : item.documentType === "FACTURA"
                    ? isEs
                      ? "Continuar"
                      : "Continue"
                    : isEs
                      ? "Facturar"
                      : "Invoice"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
