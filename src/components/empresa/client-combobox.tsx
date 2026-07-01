"use client";

import { useState, useRef, useEffect, useId, useCallback } from "react";
import Link from "next/link";
import type { Client } from "@prisma/client";

interface ClientHistory {
  history: Record<string, { count: number; lastDate: string; total: number; docs: { id: string; type: string; status: string; number: string | null; title: string; total: unknown; issueDate: string }[] }>;
  totalDocs: number;
}

interface ClientComboboxProps {
  clients: Client[];
  value: string;
  onChange: (name: string) => void;
  onSelect: (client: Client) => void;
  onNewClient: () => void;
  placeholder?: string;
  label?: string;
  selectedClientId?: string;
}

const TYPE_ICON: Record<string, string> = {
  COTIZACION: "📋",
  FACTURA: "📄",
  BITACORA: "📝",
  CORREO: "✉️",
};
const TYPE_LABEL: Record<string, string> = {
  COTIZACION: "Cotizaciones",
  FACTURA: "Facturas",
  BITACORA: "Bitácoras",
  CORREO: "Correos",
};
const TYPE_PATH: Record<string, string> = {
  COTIZACION: "cotizaciones",
  FACTURA: "facturas",
  BITACORA: "bitacoras",
  CORREO: "correos",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days}d`;
  if (days < 30) return `hace ${Math.floor(days / 7)}sem`;
  if (days < 365) return `hace ${Math.floor(days / 30)}m`;
  return `hace ${Math.floor(days / 365)}a`;
}

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

export function ClientCombobox({
  clients,
  value,
  onChange,
  onSelect,
  onNewClient,
  placeholder = "Juan Pérez",
  label,
  selectedClientId,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState<ClientHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const filtered = value.trim().length === 0
    ? clients.slice(0, 12)
    : clients.filter(
        (c) =>
          c.name.toLowerCase().includes(value.toLowerCase()) ||
          (c.company ?? "").toLowerCase().includes(value.toLowerCase()) ||
          (c.email ?? "").toLowerCase().includes(value.toLowerCase()) ||
          (c.ruc ?? "").includes(value)
      ).slice(0, 12);

  const hasExactMatch = clients.some((c) => c.name.toLowerCase() === value.toLowerCase());
  const canCreate = value.trim().length > 1 && !hasExactMatch;
  const totalItems = filtered.length + (canCreate ? 1 : 0);

  // Ghost text: suffix of first match when user is typing
  const ghostSuffix = useCallback(() => {
    if (!value.trim() || filtered.length === 0) return "";
    const first = filtered[0];
    if (first.name.toLowerCase().startsWith(value.toLowerCase()) && first.name.length > value.length) {
      return first.name.slice(value.length);
    }
    return "";
  }, [value, filtered])();

  // Fetch history when a client is selected
  const fetchHistory = useCallback(async (clientId: string) => {
    setHistoryLoading(true);
    setHistory(null);
    try {
      const res = await fetch(`/api/empresa/clients/${clientId}`);
      if (res.ok) setHistory(await res.json());
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClientId) fetchHistory(selectedClientId);
    else setHistory(null);
  }, [selectedClientId, fetchHistory]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) { setOpen(true); return; }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Tab" && ghostSuffix) {
      e.preventDefault();
      onChange(value + ghostSuffix);
      setCursor(0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (cursor < filtered.length) {
        selectClient(filtered[cursor]);
      } else if (canCreate) {
        onNewClient();
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function selectClient(client: Client) {
    onSelect(client);
    setOpen(false);
    setCursor(0);
  }

  const showDropdown = open && (filtered.length > 0 || canCreate);

  return (
    <div ref={ref} className="flex flex-col gap-0 relative">
      {label && (
        <label htmlFor={inputId} className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
          {label}
        </label>
      )}

      {/* Input with ghost text overlay */}
      <div className="relative">
        {/* Ghost text layer */}
        {ghostSuffix && open && (
          <div
            aria-hidden
            className="absolute inset-0 px-3 py-2.5 text-sm pointer-events-none flex items-center overflow-hidden rounded-lg"
          >
            <span className="invisible whitespace-pre">{value}</span>
            <span className="text-white/25">{ghostSuffix}</span>
          </div>
        )}

        <input
          id={inputId}
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setCursor(0);
          }}
          onFocus={() => { setOpen(true); setCursor(0); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all"
        />

        {/* Tab hint */}
        {ghostSuffix && open && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-white/20 font-mono bg-white/[0.04] px-1 py-0.5 rounded pointer-events-none">
            Tab ↹
          </span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d18] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto z-50"
        >
          {filtered.map((c, i) => (
            <button
              key={c.id}
              data-idx={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectClient(c); }}
              onMouseEnter={() => setCursor(i)}
              className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-3 ${cursor === i ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"}`}
            >
              <div className="min-w-0">
                <p className="text-white/80 text-sm truncate">
                  <Highlight text={c.name} query={value} />
                </p>
                {c.company && (
                  <p className="text-white/35 text-xs truncate">
                    <Highlight text={c.company} query={value} />
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                {c.ruc && <p className="text-white/25 text-xs font-mono">{c.ruc}</p>}
                {c.email && <p className="text-white/20 text-[10px] truncate max-w-28">{c.email}</p>}
              </div>
            </button>
          ))}

          {canCreate && (
            <>
              {filtered.length > 0 && <div className="border-t border-white/[0.05]" />}
              <button
                data-idx={filtered.length}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onNewClient(); setOpen(false); }}
                onMouseEnter={() => setCursor(filtered.length)}
                className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-2.5 ${cursor === filtered.length ? "bg-[#1AA7F0]/[0.07]" : "hover:bg-[#1AA7F0]/[0.04]"}`}
              >
                <span className="flex-none w-5 h-5 rounded-full bg-[#1AA7F0]/15 border border-[#1AA7F0]/30 flex items-center justify-center text-[#1AA7F0] text-xs font-bold">+</span>
                <div>
                  <p className="text-[#1AA7F0] text-sm font-medium">Crear &ldquo;{value}&rdquo;</p>
                  <p className="text-white/25 text-xs">Se guardará como nuevo cliente al crear el documento</p>
                </div>
              </button>
            </>
          )}
        </div>
      )}

      {/* Client history panel — shown after selecting an existing client */}
      {selectedClientId && !open && (
        <div className="mt-2 bg-[#0d0d18] border border-white/[0.06] rounded-xl overflow-hidden">
          {historyLoading ? (
            <div className="px-4 py-3 text-white/25 text-xs">Cargando historial...</div>
          ) : history && history.totalDocs > 0 ? (
            <>
              <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
                <p className="text-white/50 text-xs font-medium">
                  Histórico · {history.totalDocs} documento{history.totalDocs !== 1 ? "s" : ""}
                </p>
                <Link
                  href={`/empresa/clientes/${selectedClientId}`}
                  className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ver perfil →
                </Link>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {Object.entries(history.history).map(([type, data]) => (
                  <div key={type} className="px-4 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-white/60 text-xs flex items-center gap-1.5">
                        <span>{TYPE_ICON[type] ?? "📄"}</span>
                        <span className="font-medium">{TYPE_LABEL[type] ?? type}</span>
                        <span className="text-white/30">·</span>
                        <span className="text-white/30">{data.count}</span>
                      </p>
                      <span className="text-white/20 text-[10px]">
                        último {fmtDate(data.lastDate)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {data.docs.map((doc) => (
                        <Link
                          key={doc.id}
                          href={`/empresa/${TYPE_PATH[type] ?? type.toLowerCase()}s/${doc.id}`}
                          className="flex items-center justify-between gap-2 text-[10px] hover:text-white/60 transition-colors group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-white/30 font-mono group-hover:text-[#1AA7F0]/60">{doc.number ?? doc.title.slice(0, 30)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] border ${doc.status === "ACCEPTED" || doc.status === "PAID" ? "border-green-500/20 text-green-400/60" : doc.status === "SENT" ? "border-blue-500/20 text-blue-400/60" : doc.status === "REJECTED" ? "border-red-500/20 text-red-400/60" : "border-white/10 text-white/25"}`}>
                            {doc.status}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : history && history.totalDocs === 0 ? (
            <div className="px-4 py-3 text-white/20 text-xs flex items-center justify-between">
              <span>Sin documentos previos con este cliente</span>
              <Link href={`/empresa/clientes/${selectedClientId}`} className="text-[#1AA7F0]/50 hover:text-[#1AA7F0] transition-colors text-[10px]">
                Ver perfil →
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
