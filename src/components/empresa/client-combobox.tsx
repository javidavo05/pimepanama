"use client";

import { useState, useRef, useEffect } from "react";
import type { Client } from "@prisma/client";

interface ClientComboboxProps {
  clients: Client[];
  onSelect: (client: Client | null) => void;
  initialName?: string;
}

export function ClientCombobox({ clients, onSelect, initialName = "" }: ClientComboboxProps) {
  const [query, setQuery] = useState(initialName);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.length < 1
    ? clients.slice(0, 8)
    : clients.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          (c.company ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (c.ruc ?? "").includes(query)
      ).slice(0, 8);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onSelect(null); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar cliente existente..."
        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-[#0d0d18] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setQuery(c.name);
                setOpen(false);
                onSelect(c);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-white/[0.05] transition-colors flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-white text-sm font-medium">{c.name}</p>
                {c.company && <p className="text-white/40 text-xs">{c.company}</p>}
              </div>
              {c.ruc && <span className="text-white/30 text-xs font-mono shrink-0">{c.ruc}</span>}
            </button>
          ))}
          {query.length > 0 && (
            <div className="px-4 py-2 border-t border-white/[0.05]">
              <p className="text-white/30 text-xs">Completa los datos abajo para crear nuevo cliente</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
