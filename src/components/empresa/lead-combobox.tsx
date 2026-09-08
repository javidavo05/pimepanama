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
      <span className="text-fg font-semibold">{text.slice(i, i + query.length)}</span>
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
        <label htmlFor={inputId} className="block text-fg-faint text-xs uppercase tracking-widest mb-1.5">
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
        className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-sand/40 transition-all"
      />

      {showDropdown && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-pop border border-line rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto z-50"
        >
          {filtered.map((l, i) => (
            <button
              key={l.id}
              data-idx={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectLead(l); }}
              onMouseEnter={() => setCursor(i)}
              className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-3 ${cursor === i ? "bg-fill-2" : "hover:bg-fill"}`}
            >
              <div className="min-w-0">
                <p className="text-fg-soft text-sm truncate">
                  <Highlight text={l.name} query={value} />
                </p>
                {l.company && (
                  <p className="text-fg-dim text-xs truncate">
                    <Highlight text={l.company} query={value} />
                  </p>
                )}
              </div>
              <span className="text-fg-faint text-[10px] shrink-0">{l.status}</span>
            </button>
          ))}
        </div>
      )}

      {selectedLeadId && !open && (
        <div className="mt-2 bg-pop border border-line rounded-xl overflow-hidden">
          {historyLoading ? (
            <div className="px-4 py-3 text-fg-faint text-xs">Cargando historial...</div>
          ) : history && history.totalDocs > 0 ? (
            <>
              <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
                <p className="text-fg-faint text-xs font-medium">
                  Histórico · {history.totalDocs} documento{history.totalDocs !== 1 ? "s" : ""}
                </p>
                <Link
                  href={`/empresa/leads/${selectedLeadId}`}
                  className="text-brand-fg/60 text-[10px] hover:text-brand-fg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ver ficha →
                </Link>
              </div>
              <div className="divide-y divide-line">
                {Object.entries(history.history).map(([type, data]) => (
                  <div key={type} className="px-4 py-2.5">
                    <div className="space-y-0.5">
                      {data.docs.map((doc) => (
                        <Link
                          key={doc.id}
                          href={`/empresa/${TYPE_PATH[type] ?? type.toLowerCase()}/${doc.id}`}
                          className="flex items-center justify-between gap-2 text-[10px] hover:text-fg-dim transition-colors group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-fg-dim font-mono group-hover:text-brand-fg/60">{doc.number ?? doc.title.slice(0, 30)}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] border border-line-mid text-fg-faint">{doc.status}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : history && history.totalDocs === 0 ? (
            <div className="px-4 py-3 text-fg-faint text-xs flex items-center justify-between">
              <span>Sin documentos previos con este lead</span>
              <Link href={`/empresa/leads/${selectedLeadId}`} className="text-brand-fg/50 hover:text-brand-fg transition-colors text-[10px]">
                Ver ficha →
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
