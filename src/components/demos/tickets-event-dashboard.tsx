"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

type Event = {
  id: string;
  name: string;
  date: string;
  venue: string;
  capacity: number;
  sold: number;
  revenue: number;
  status: "active" | "sold-out" | "upcoming";
};

const EVENTS: Event[] = [
  { id: "e1", name: "Festival Panamá Jazz 2025", date: "2025-03-15", venue: "Atlapa Convention Center", capacity: 5000, sold: 4872, revenue: 243600, status: "active" },
  { id: "e2", name: "Concierto Bad Bunny", date: "2025-04-20", venue: "Estadio Rommel Fernández", capacity: 40000, sold: 40000, revenue: 3200000, status: "sold-out" },
  { id: "e3", name: "Tech Summit Panamá", date: "2025-05-10", venue: "Hard Rock Hotel", capacity: 800, sold: 312, revenue: 93600, status: "upcoming" },
  { id: "e4", name: "Feria Internacional", date: "2025-06-01", venue: "ATLAPA", capacity: 10000, sold: 7841, revenue: 392050, status: "active" },
];

const STATUS_COLORS = {
  active: { bg: "bg-[#22c55e]/15", text: "text-[#22c55e]", border: "border-[#22c55e]/30", label: "Activo" },
  "sold-out": { bg: "bg-[#ef4444]/15", text: "text-[#ef4444]", border: "border-[#ef4444]/30", label: "Agotado" },
  upcoming: { bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", border: "border-[#f59e0b]/30", label: "Próximo" },
};

type Ticket = {
  code: string;
  holder: string;
  seat: string;
  type: "VIP" | "General" | "Premium";
  validated: boolean;
};

const MOCK_TICKETS: Ticket[] = [
  { code: "TK-2A9F-4B3C", holder: "María Rodríguez", seat: "A12", type: "VIP", validated: true },
  { code: "TK-7E1D-9C2A", holder: "Carlos Méndez", seat: "B34", type: "General", validated: false },
  { code: "TK-3F8A-1D5B", holder: "Ana Torres", seat: "VIP-01", type: "VIP", validated: true },
  { code: "TK-9B2E-6C7F", holder: "Luis García", seat: "C17", type: "Premium", validated: false },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export function TicketsEventDashboard() {
  const [selectedEvent, setSelectedEvent] = useState<Event>(EVENTS[0]);
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<{ ticket: Ticket; status: "valid" | "used" | "invalid" } | null>(null);

  const sold = selectedEvent.sold;
  const pct = Math.round((sold / selectedEvent.capacity) * 100);

  function handleScan() {
    const found = MOCK_TICKETS.find((t) => t.code.toLowerCase() === scanInput.toLowerCase());
    if (!found) {
      setScanResult(null);
      setTimeout(() => setScanResult({ ticket: { code: scanInput, holder: "—", seat: "—", type: "General", validated: false }, status: "invalid" }), 0);
    } else if (found.validated) {
      setScanResult({ ticket: found, status: "used" });
    } else {
      setScanResult({ ticket: found, status: "valid" });
    }
    setScanInput("");
  }

  return (
    <div className="space-y-6">
      {/* stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Eventos activos", value: "4", icon: "ph:calendar-check" },
          { label: "Tickets vendidos", value: "53,025", icon: "ph:ticket" },
          { label: "Ingresos totales", value: "$3.9M", icon: "ph:currency-dollar" },
          { label: "Validaciones hoy", value: "1,247", icon: "ph:qr-code" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <Icon icon={stat.icon} className="mb-2 h-5 w-5 text-[#60A5FA]/70" />
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* event list */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Eventos</p>
          <div className="space-y-2">
            {EVENTS.map((ev) => {
              const s = STATUS_COLORS[ev.status];
              const p = Math.round((ev.sold / ev.capacity) * 100);
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedEvent.id === ev.id
                      ? "border-[#2563EB]/50 bg-[#2563EB]/10"
                      : "border-white/8 bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{ev.name}</p>
                      <p className="text-[10px] text-white/40">{ev.venue}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${s.bg} ${s.text} ${s.border}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] text-white/40">
                      <span>{ev.sold.toLocaleString()} / {ev.capacity.toLocaleString()}</span>
                      <span>{p}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-1 rounded-full ${p >= 100 ? "bg-[#ef4444]" : p > 80 ? "bg-[#f59e0b]" : "bg-[#22c55e]"}`}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* QR scanner simulation */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/40">Scanner QR / NFC</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleScan(); }}
                placeholder="Código: TK-2A9F-4B3C"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#2563EB]/50"
              />
              <button
                onClick={handleScan}
                className="rounded-xl border border-[#2563EB]/40 bg-[#2563EB]/15 px-3 py-2 text-xs font-semibold text-[#60A5FA] transition hover:bg-[#2563EB]/25"
              >
                Validar
              </button>
            </div>
            <p className="mt-1.5 text-[9px] text-white/25">Prueba: TK-2A9F-4B3C (VIP válido) · TK-3F8A-1D5B (ya usado)</p>

            <AnimatePresence mode="wait">
              {scanResult ? (
                <motion.div
                  key={scanResult.ticket.code + scanResult.status}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className={`mt-3 rounded-xl border p-3 ${
                    scanResult.status === "valid"
                      ? "border-[#22c55e]/30 bg-[#22c55e]/10"
                      : scanResult.status === "used"
                      ? "border-[#f59e0b]/30 bg-[#f59e0b]/10"
                      : "border-[#ef4444]/30 bg-[#ef4444]/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      icon={
                        scanResult.status === "valid"
                          ? "ph:check-circle-fill"
                          : scanResult.status === "used"
                          ? "ph:warning-circle-fill"
                          : "ph:x-circle-fill"
                      }
                      className={`h-5 w-5 ${
                        scanResult.status === "valid"
                          ? "text-[#22c55e]"
                          : scanResult.status === "used"
                          ? "text-[#f59e0b]"
                          : "text-[#ef4444]"
                      }`}
                    />
                    <div>
                      <p className={`text-xs font-bold ${
                        scanResult.status === "valid" ? "text-[#22c55e]" : scanResult.status === "used" ? "text-[#f59e0b]" : "text-[#ef4444]"
                      }`}>
                        {scanResult.status === "valid" ? "✓ Acceso permitido" : scanResult.status === "used" ? "⚠ Ya validado" : "✗ Código inválido"}
                      </p>
                      {scanResult.status !== "invalid" && (
                        <p className="text-[10px] text-white/50">
                          {scanResult.ticket.holder} · {scanResult.ticket.type} · {scanResult.ticket.seat}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* selected event stats */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/40">
              {selectedEvent.name}
            </p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-white/50">Ocupación</span>
                <span className="text-sm font-bold text-white">{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10">
                <motion.div
                  key={selectedEvent.id}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, type: "spring" }}
                  className={`h-2 rounded-full ${pct >= 100 ? "bg-[#ef4444]" : pct > 80 ? "bg-[#f59e0b]" : "bg-[#22c55e]"}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <p className="text-[10px] text-white/35">Tickets vendidos</p>
                  <p className="text-base font-bold text-white">{sold.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/35">Ingresos</p>
                  <p className="text-base font-bold text-[#60A5FA]">{fmt(selectedEvent.revenue)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
