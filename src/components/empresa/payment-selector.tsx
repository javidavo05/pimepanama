"use client";

import { useEffect, useState } from "react";
import type { PaymentMethod } from "@prisma/client";
import { calcCommission, fmtUSD } from "@/lib/commission";

interface PaymentSelectorProps {
  methods: PaymentMethod[];
  selectedId: string;
  grossAmount: number;
  onChange: (id: string) => void;
  lang?: "es" | "en";
}

export function PaymentSelector({ methods, selectedId, grossAmount, onChange, lang = "es" }: PaymentSelectorProps) {
  const [commission, setCommission] = useState<ReturnType<typeof calcCommission> | null>(null);

  const selected = methods.find((m) => m.id === selectedId);

  useEffect(() => {
    if (!selected || grossAmount <= 0) { setCommission(null); return; }
    const pct = Number(selected.commissionPct);
    const flat = Number(selected.commissionFlat);
    const tax = Number(selected.commissionTax);
    if (pct === 0 && flat === 0) { setCommission(null); return; }
    setCommission(calcCommission(grossAmount, pct, flat, tax));
  }, [selectedId, grossAmount, selected]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`px-3 py-2.5 rounded-lg text-sm text-left transition-all border ${
              selectedId === m.id
                ? "bg-[#1AA7F0]/10 border-[#1AA7F0]/40 text-[#1AA7F0]"
                : "border-white/[0.07] text-white/50 hover:text-white/80 hover:border-white/20"
            }`}
          >
            <span className="block font-medium truncate">{m.name}</span>
            {Number(m.commissionPct) > 0 && (
              <span className="text-xs opacity-60">{Number(m.commissionPct)}% + ${fmtUSD(Number(m.commissionFlat))}</span>
            )}
            {m.bankName && <span className="text-xs opacity-60 block truncate">{m.bankName}</span>}
          </button>
        ))}
      </div>

      {commission && selected && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-1.5">
          <p className="text-amber-400/80 text-xs uppercase tracking-widest font-semibold mb-2">
            {lang === "es" ? "Desglose de comisión — " : "Commission breakdown — "}{selected.name}
          </p>
          <Row label={lang === "es" ? "Total bruto" : "Gross total"} value={`$${fmtUSD(grossAmount)}`} />
          <Row label={lang === "es" ? "Comisión base" : "Base commission"} value={`−$${fmtUSD(commission.commissionBase)}`} dim />
          {commission.commissionTaxAmt > 0 && (
            <Row label={`ITBMS (7%) sobre comisión`} value={`−$${fmtUSD(commission.commissionTaxAmt)}`} dim />
          )}
          <div className="border-t border-amber-500/10 pt-2 mt-2 flex justify-between items-center">
            <span className="text-white/60 text-sm font-semibold">
              {lang === "es" ? "Neto recibido" : "Net received"}
            </span>
            <span className="text-green-400 font-mono text-lg font-bold">${fmtUSD(commission.netAmount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${dim ? "text-white/30" : "text-white/50"}`}>{label}</span>
      <span className={`text-xs font-mono ${dim ? "text-amber-400/50" : "text-white/70"}`}>{value}</span>
    </div>
  );
}
