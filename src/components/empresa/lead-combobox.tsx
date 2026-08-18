"use client";

import { useState, useRef, useEffect, useId, useCallback } from "react";
import Link from "next/link";
import type { SerializedLead } from "@/lib/serializers";

interface LeadHistory {
  history: Record<string, { count: number; lastDate: string; total: number; docs: { id: string; type: string; status: string; number: string | null; title: string; total: unknown; issueDate: string }[] }>;
  totalDocs: number;
}

interface LeadComboboxProps {
  leads: SerializedLead[];
  value: string;
  onChange: (name: string) => void;
  onSelect: (lead: SerializedLead) => void;
  placeholder?: string;
  label?: string;
  selectedLeadId?: string;
}

const TYPE_PATH: Record<string, string> = {
  COTIZACION: "cotizaciones",
  FACTURA: "facturas",
  BITACORA: "bitacoras",
  CORREO: "correos",
};

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-white font-semibold">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
}

export function LeadCombobox({
  leads,
  value,
  onChange,
  onSelect,
  placeholder = "Juan Pérez",
  label,
  selectedLeadId,
}: LeadComboboxProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState<LeadHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const filtered = value.trim().length === 0
    ? leads.slice(0, 12)
    : leads.filter(
        (l) =>
          l.name.toLowerCase().includes(value.toLowerCase()) ||
          (l.company ?? "").toLowerCase().includes(value.toLowerCase()) ||
          (l.email ?? "").toLowerCase().includes(value.toLowerCase())
      ).slice(0, 12);

  const fetchHistory = useCallback(async (leadId: string) => {
    setHistoryLoading(true);
    setHistory(null);
    try {
      const res = await fetch(`/api/empresa/leads/${leadId}`);
      if (res.ok) setHistory(await res.json());
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLeadId) fetchHistory(selectedLeadId);
    else setHistory(null);
  }, [selectedLeadId, fetchHistory]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) { setOpen(true); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[cursor]) selectLead(filtered[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function selectLead(lead: SerializedLead) {
    onSelect(lead);
    setOpen(false);
    setCursor(0);
  }

  const showDropdown = open && filtered.length > 0;

  return (
    <div ref={ref} className="flex flex-col gap-0 relative">
      {label && (
        <label htmlFor={inputId} className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
          {label}
        </label>
      )}

      <input
        id={inputId}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setCursor(0); }}
        onFocus={() => { setOpen(true); setCursor(0); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all"
      />

      {showDropdown && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d18] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto z-50"
        >
          {filtered.map((l, i) => (
            <button
              key={l.id}
              data-idx={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectLead(l); }}
              onMouseEnter={() => setCursor(i)}
              className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-3 ${cursor === i ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"}`}
            >
              <div className="min-w-0">
                <p className="text-white/80 text-sm truncate">
                  <Highlight text={l.name} query={value} />
                </p>
                {l.company && (
                  <p className="text-white/55 text-xs truncate">
                    <Highlight text={l.company} query={value} />
                  </p>
                )}
              </div>
              <span className="text-white/50 text-[10px] shrink-0">{l.status}</span>
            </button>
          ))}
        </div>
      )}

      {selectedLeadId && !open && (
        <div className="mt-2 bg-[#0d0d18] border border-white/[0.06] rounded-xl overflow-hidden">
          {historyLoading ? (
            <div className="px-4 py-3 text-white/50 text-xs">Cargando historial...</div>
          ) : history && history.totalDocs > 0 ? (
            <>
              <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
                <p className="text-white/50 text-xs font-medium">
                  Histórico · {history.totalDocs} documento{history.totalDocs !== 1 ? "s" : ""}
                </p>
                <Link
                  href={`/empresa/leads/${selectedLeadId}`}
                  className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ver ficha →
                </Link>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {Object.entries(history.history).map(([type, data]) => (
                  <div key={type} className="px-4 py-2.5">
                    <div className="space-y-0.5">
                      {data.docs.map((doc) => (
                        <Link
                          key={doc.id}
                          href={`/empresa/${TYPE_PATH[type] ?? type.toLowerCase()}/${doc.id}`}
                          className="flex items-center justify-between gap-2 text-[10px] hover:text-white/60 transition-colors group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-white/55 font-mono group-hover:text-[#1AA7F0]/60">{doc.number ?? doc.title.slice(0, 30)}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] border border-white/10 text-white/50">{doc.status}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : history && history.totalDocs === 0 ? (
            <div className="px-4 py-3 text-white/50 text-xs flex items-center justify-between">
              <span>Sin documentos previos con este lead</span>
              <Link href={`/empresa/leads/${selectedLeadId}`} className="text-[#1AA7F0]/50 hover:text-[#1AA7F0] transition-colors text-[10px]">
                Ver ficha →
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
