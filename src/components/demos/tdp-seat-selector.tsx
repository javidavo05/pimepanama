"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type Seat = {
  id: string;
  number: string;
  x: number;
  y: number;
  type: "single" | "double" | "aisle";
  isAvailable: boolean;
  isLocked?: boolean;
};

const MOCK_SEATS: Seat[] = [
  // Row 1
  { id: "1A", number: "1A", x: 20, y: 20, type: "single", isAvailable: true },
  { id: "1B", number: "1B", x: 70, y: 20, type: "single", isAvailable: false },
  { id: "1C", number: "1C", x: 140, y: 20, type: "single", isAvailable: true },
  { id: "1D", number: "1D", x: 190, y: 20, type: "single", isAvailable: true },
  // Row 2
  { id: "2A", number: "2A", x: 20, y: 80, type: "single", isAvailable: true },
  { id: "2B", number: "2B", x: 70, y: 80, type: "single", isAvailable: true },
  { id: "2C", number: "2C", x: 140, y: 80, type: "single", isAvailable: false },
  { id: "2D", number: "2D", x: 190, y: 80, type: "single", isAvailable: true },
  // Row 3
  { id: "3A", number: "3A", x: 20, y: 140, type: "single", isAvailable: false },
  { id: "3B", number: "3B", x: 70, y: 140, type: "single", isAvailable: true },
  { id: "3C", number: "3C", x: 140, y: 140, type: "single", isAvailable: true },
  { id: "3D", number: "3D", x: 190, y: 140, type: "single", isAvailable: true },
  // Row 4
  { id: "4A", number: "4A", x: 20, y: 200, type: "single", isAvailable: true },
  { id: "4B", number: "4B", x: 70, y: 200, type: "single", isAvailable: false },
  { id: "4C", number: "4C", x: 140, y: 200, type: "single", isAvailable: true },
  { id: "4D", number: "4D", x: 190, y: 200, type: "single", isAvailable: false },
  // Row 5
  { id: "5A", number: "5A", x: 20, y: 260, type: "single", isAvailable: true },
  { id: "5B", number: "5B", x: 70, y: 260, type: "single", isAvailable: true },
  { id: "5C", number: "5C", x: 140, y: 260, type: "single", isAvailable: true },
  { id: "5D", number: "5D", x: 190, y: 260, type: "single", isLocked: true, isAvailable: false },
  // Row 6
  { id: "6A", number: "6A", x: 20, y: 320, type: "single", isAvailable: false },
  { id: "6B", number: "6B", x: 70, y: 320, type: "single", isAvailable: true },
  { id: "6C", number: "6C", x: 140, y: 320, type: "single", isAvailable: true },
  { id: "6D", number: "6D", x: 190, y: 320, type: "single", isAvailable: true },
];

const ROUTES = [
  { id: "r1", name: "Panamá → David", time: "06:00", date: "16 Jun 2025", price: 25 },
  { id: "r2", name: "Panamá → Santiago", time: "08:30", date: "16 Jun 2025", price: 15 },
  { id: "r3", name: "David → Panamá", time: "14:00", date: "16 Jun 2025", price: 25 },
];

export function TdpSeatSelectorDemo() {
  const [selectedRoute, setSelectedRoute] = useState(ROUTES[0]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [step, setStep] = useState<"route" | "seat" | "confirm">("route");

  const selectedSeatData = MOCK_SEATS.find((s) => s.id === selectedSeat);

  const getSeatStyle = (seat: Seat): string => {
    if (seat.isLocked) return "bg-red-500/20 border border-red-500/40 text-red-400 cursor-not-allowed";
    if (!seat.isAvailable) return "bg-white/5 border border-white/8 text-white/25 cursor-not-allowed";
    if (seat.id === selectedSeat) return "bg-[#2563EB] border border-[#2563EB] text-white shadow-[0_0_12px_rgba(37,99,235,0.6)] scale-110";
    return "bg-white/8 border border-white/15 text-white/70 hover:bg-[#2563EB]/30 hover:border-[#2563EB]/60 hover:text-white cursor-pointer";
  };

  return (
    <div className="space-y-6 text-white">
      {/* step indicator */}
      <div className="flex items-center gap-3">
        {["route", "seat", "confirm"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s
                  ? "bg-[#2563EB] text-white"
                  : ["route", "seat", "confirm"].indexOf(step) > i
                  ? "bg-[#2563EB]/30 text-[#60A5FA]"
                  : "bg-white/8 text-white/30"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs uppercase tracking-wider ${step === s ? "text-white" : "text-white/30"}`}>
              {s === "route" ? "Ruta" : s === "seat" ? "Asiento" : "Confirmar"}
            </span>
            {i < 2 && <div className="mx-1 h-px w-8 bg-white/10" />}
          </div>
        ))}
      </div>

      {step === "route" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Selecciona tu ruta</p>
          {ROUTES.map((route) => (
            <button
              key={route.id}
              onClick={() => { setSelectedRoute(route); setStep("seat"); }}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${
                selectedRoute.id === route.id
                  ? "border-[#2563EB]/60 bg-[#2563EB]/10"
                  : "border-white/10 bg-white/[0.03] hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{route.name}</p>
                  <p className="mt-0.5 text-xs text-white/40">{route.date} · Salida {route.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#60A5FA]">${route.price}</p>
                  <p className="text-[10px] text-white/30">por persona</p>
                </div>
              </div>
            </button>
          ))}
        </motion.div>
      )}

      {step === "seat" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">{selectedRoute.name}</p>
            <button onClick={() => setStep("route")} className="text-xs text-[#60A5FA] hover:text-white">← Cambiar ruta</button>
          </div>

          {/* bus outline */}
          <div className="relative mx-auto w-fit rounded-3xl border border-white/15 bg-white/[0.02] p-6 pt-10">
            {/* driver */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">🚌</div>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Frente</span>
            </div>

            {/* seat grid */}
            <div className="relative" style={{ width: 260, height: 380 }}>
              {MOCK_SEATS.map((seat) => (
                <button
                  key={seat.id}
                  disabled={!seat.isAvailable || !!seat.isLocked}
                  onClick={() => setSelectedSeat(seat.id)}
                  title={`Asiento ${seat.number}`}
                  className={`absolute h-10 w-10 rounded-lg text-xs font-bold transition-all duration-150 ${getSeatStyle(seat)}`}
                  style={{ left: seat.x, top: seat.y }}
                >
                  {seat.number}
                </button>
              ))}
              {/* aisle divider */}
              <div className="absolute top-0 bottom-0 bg-white/5 rounded-full" style={{ left: 112, width: 16 }} />
            </div>
          </div>

          {/* legend */}
          <div className="flex flex-wrap justify-center gap-4 text-[10px] text-white/40">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-white/8 border border-white/15" />Disponible</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#2563EB]" />Seleccionado</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-white/5 border border-white/8" />Ocupado</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-500/20 border border-red-500/40" />Bloqueado</span>
          </div>

          {selectedSeat && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-2xl border border-[#2563EB]/30 bg-[#2563EB]/10 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-white">Asiento {selectedSeat} · {selectedRoute.name}</p>
                <p className="text-xs text-white/50">{selectedRoute.date} · {selectedRoute.time}</p>
              </div>
              <button
                onClick={() => setStep("confirm")}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]"
              >
                Continuar →
              </button>
            </motion.div>
          )}
        </motion.div>
      )}

      {step === "confirm" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Confirma tu compra</p>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Ruta</span>
              <span className="font-medium text-white">{selectedRoute.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Fecha y hora</span>
              <span className="font-medium text-white">{selectedRoute.date} · {selectedRoute.time}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Asiento</span>
              <span className="font-medium text-white">{selectedSeat}</span>
            </div>
            <div className="border-t border-white/8 pt-3 flex justify-between">
              <span className="text-white/50">Total</span>
              <span className="text-xl font-bold text-[#60A5FA]">${selectedRoute.price}.00</span>
            </div>
          </div>

          {/* payment methods */}
          <div className="space-y-2">
            <p className="text-xs text-white/30 uppercase tracking-wider">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {["Yappy", "Tarjeta", "Efectivo"].map((method) => (
                <button key={method} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs font-medium text-white/50 hover:border-[#2563EB]/40 hover:text-white transition-colors">
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("seat")}
              className="flex-1 rounded-xl border border-white/10 py-3 text-xs font-semibold text-white/50 hover:text-white transition-colors"
            >
              ← Volver
            </button>
            <button
              onClick={() => { setSelectedSeat(null); setStep("route"); }}
              className="flex-[2] rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563EB] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
              Comprar ticket — ${selectedRoute.price}
            </button>
          </div>

          <p className="text-center text-[10px] text-white/20">* Demo interactivo — no se procesa pago real</p>
        </motion.div>
      )}
    </div>
  );
}
