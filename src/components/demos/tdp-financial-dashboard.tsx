"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type Period = "day" | "week" | "month" | "year";

const DATA: Record<Period, {
  total: number;
  change: string;
  byTerminal: { name: string; amount: number }[];
  byRoute: { name: string; amount: number }[];
  byMethod: { method: string; amount: number; color: string }[];
  trend: { label: string; amount: number }[];
}> = {
  day: {
    total: 18500,
    change: "+5.2%",
    byTerminal: [
      { name: "Terminal David", amount: 6800 },
      { name: "Terminal Santiago", amount: 5200 },
      { name: "Terminal Panamá", amount: 6500 },
    ],
    byRoute: [
      { name: "Panamá → David", amount: 7200 },
      { name: "David → Santiago", amount: 4800 },
      { name: "Santiago → Panamá", amount: 6500 },
    ],
    byMethod: [
      { method: "Yappy", amount: 8000, color: "#22c55e" },
      { method: "Efectivo", amount: 6000, color: "#60A5FA" },
      { method: "Tarjeta", amount: 4500, color: "#a78bfa" },
    ],
    trend: [
      { label: "06h", amount: 1200 },
      { label: "09h", amount: 3800 },
      { label: "12h", amount: 5500 },
      { label: "15h", amount: 4200 },
      { label: "18h", amount: 2800 },
      { label: "21h", amount: 1000 },
    ],
  },
  week: {
    total: 125000,
    change: "+12.5%",
    byTerminal: [
      { name: "Terminal David", amount: 45000 },
      { name: "Terminal Santiago", amount: 35000 },
      { name: "Terminal Panamá", amount: 45000 },
    ],
    byRoute: [
      { name: "Panamá → David", amount: 45000 },
      { name: "David → Santiago", amount: 30000 },
      { name: "Santiago → Panamá", amount: 50000 },
    ],
    byMethod: [
      { method: "Yappy", amount: 50000, color: "#22c55e" },
      { method: "Efectivo", amount: 40000, color: "#60A5FA" },
      { method: "Tarjeta", amount: 35000, color: "#a78bfa" },
    ],
    trend: [
      { label: "Lun", amount: 15000 },
      { label: "Mar", amount: 18000 },
      { label: "Mié", amount: 20000 },
      { label: "Jue", amount: 22000 },
      { label: "Vie", amount: 25000 },
      { label: "Sáb", amount: 15000 },
      { label: "Dom", amount: 10000 },
    ],
  },
  month: {
    total: 498000,
    change: "+18.3%",
    byTerminal: [
      { name: "Terminal David", amount: 185000 },
      { name: "Terminal Santiago", amount: 142000 },
      { name: "Terminal Panamá", amount: 171000 },
    ],
    byRoute: [
      { name: "Panamá → David", amount: 188000 },
      { name: "David → Santiago", amount: 122000 },
      { name: "Santiago → Panamá", amount: 188000 },
    ],
    byMethod: [
      { method: "Yappy", amount: 200000, color: "#22c55e" },
      { method: "Efectivo", amount: 160000, color: "#60A5FA" },
      { method: "Tarjeta", amount: 138000, color: "#a78bfa" },
    ],
    trend: [
      { label: "S1", amount: 110000 },
      { label: "S2", amount: 125000 },
      { label: "S3", amount: 132000 },
      { label: "S4", amount: 131000 },
    ],
  },
  year: {
    total: 5840000,
    change: "+24.1%",
    byTerminal: [
      { name: "Terminal David", amount: 2150000 },
      { name: "Terminal Santiago", amount: 1680000 },
      { name: "Terminal Panamá", amount: 2010000 },
    ],
    byRoute: [
      { name: "Panamá → David", amount: 2200000 },
      { name: "David → Santiago", amount: 1440000 },
      { name: "Santiago → Panamá", amount: 2200000 },
    ],
    byMethod: [
      { method: "Yappy", amount: 2350000, color: "#22c55e" },
      { method: "Efectivo", amount: 1880000, color: "#60A5FA" },
      { method: "Tarjeta", amount: 1610000, color: "#a78bfa" },
    ],
    trend: [
      { label: "Ene", amount: 420000 },
      { label: "Feb", amount: 380000 },
      { label: "Mar", amount: 450000 },
      { label: "Abr", amount: 490000 },
      { label: "May", amount: 520000 },
      { label: "Jun", amount: 580000 },
      { label: "Jul", amount: 610000 },
      { label: "Ago", amount: 590000 },
      { label: "Sep", amount: 560000 },
      { label: "Oct", amount: 620000 },
      { label: "Nov", amount: 670000 },
      { label: "Dic", amount: 950000 },
    ],
  },
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export function TdpFinancialDashboard() {
  const [period, setPeriod] = useState<Period>("week");
  const d = DATA[period];
  const maxTrend = Math.max(...d.trend.map((t) => t.amount));

  return (
    <div className="space-y-5 text-white">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Dashboard Financiero</h3>
          <p className="text-xs text-white/40">TDP — Transporte Digital Panameño</p>
        </div>
        <div className="flex gap-1">
          {(["day", "week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                period === p
                  ? "bg-[#2563EB] text-white"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
              }`}
            >
              {p === "day" ? "Hoy" : p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <motion.div
        key={period}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-[#2563EB]/20 bg-gradient-to-br from-[#2563EB]/10 via-transparent to-transparent p-5"
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Revenue Total</p>
            <p className="mt-1 text-4xl font-bold text-white">{fmt(d.total)}</p>
          </div>
          <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-2.5 py-1 text-xs font-semibold text-[#22c55e]">
            {d.change} vs anterior
          </span>
        </div>
      </motion.div>

      {/* trend chart */}
      <motion.div
        key={`chart-${period}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Tendencia</p>
        <div className="flex items-end gap-1.5" style={{ height: 80 }}>
          {d.trend.map((item, i) => (
            <div key={i} className="group flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-col justify-end" style={{ height: 64 }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.amount / maxTrend) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: "easeOut" }}
                  className="w-full rounded-t bg-gradient-to-t from-[#2563EB] to-[#60A5FA] opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <span className="text-[9px] text-white/30">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* breakdown grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* by terminal */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Por Terminal</p>
          {d.byTerminal.map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">{item.name}</span>
                <span className="font-semibold text-white">{fmt(item.amount)}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.amount / d.total) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="h-full rounded-full bg-[#2563EB]"
                />
              </div>
            </div>
          ))}
        </div>

        {/* by method */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Método de Pago</p>
          {d.byMethod.map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">{item.method}</span>
                <span className="font-semibold text-white">{fmt(item.amount)}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.amount / d.total) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[10px] text-white/20">* Demo con datos simulados — dashboard real del sistema TDP</p>
    </div>
  );
}
