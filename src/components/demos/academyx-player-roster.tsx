"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

type Player = {
  id: string;
  name: string;
  age: number;
  category: string;
  position: string;
  status: "active" | "injured" | "inactive";
  goals: number;
  assists: number;
  attendance: number;
  fees: "paid" | "pending" | "overdue";
  parent: string;
};

const PLAYERS: Player[] = [
  { id: "p1", name: "Diego Suárez", age: 14, category: "Sub-15", position: "Delantero", status: "active", goals: 12, assists: 4, attendance: 95, fees: "paid", parent: "Carlos Suárez" },
  { id: "p2", name: "Mateo Herrera", age: 12, category: "Sub-13", position: "Mediocampista", status: "active", goals: 3, assists: 11, attendance: 88, fees: "paid", parent: "José Herrera" },
  { id: "p3", name: "Andrés Mora", age: 15, category: "Sub-15", position: "Portero", status: "injured", goals: 0, assists: 1, attendance: 70, fees: "pending", parent: "Manuel Mora" },
  { id: "p4", name: "Sebastián Castro", age: 11, category: "Sub-13", position: "Defensa", status: "active", goals: 1, assists: 6, attendance: 92, fees: "paid", parent: "Pedro Castro" },
  { id: "p5", name: "Julián Ríos", age: 14, category: "Sub-15", position: "Extremo", status: "inactive", goals: 5, assists: 8, attendance: 55, fees: "overdue", parent: "Luis Ríos" },
  { id: "p6", name: "Santiago Pinto", age: 12, category: "Sub-13", position: "Delantero", status: "active", goals: 9, assists: 2, attendance: 98, fees: "paid", parent: "Marta Pinto" },
];

const SCHEDULE = [
  { day: "Lunes", time: "16:00–17:30", category: "Sub-13", coach: "Miguel Torres", field: "Cancha A" },
  { day: "Miércoles", time: "16:00–17:30", category: "Sub-13", coach: "Miguel Torres", field: "Cancha A" },
  { day: "Martes", time: "17:00–18:30", category: "Sub-15", coach: "Carlos Vega", field: "Cancha B" },
  { day: "Jueves", time: "17:00–18:30", category: "Sub-15", coach: "Carlos Vega", field: "Cancha B" },
  { day: "Sábado", time: "08:00–10:00", category: "Ambas", coach: "Todos", field: "Campo Principal" },
];

const STATUS_STYLE = {
  active: { label: "Activo", bg: "bg-[#22c55e]/15", text: "text-[#22c55e]", border: "border-[#22c55e]/25" },
  injured: { label: "Lesionado", bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", border: "border-[#f59e0b]/25" },
  inactive: { label: "Inactivo", bg: "bg-white/5", text: "text-white/40", border: "border-white/10" },
};

const FEES_STYLE = {
  paid: { label: "Al día", color: "text-[#22c55e]" },
  pending: { label: "Pendiente", color: "text-[#f59e0b]" },
  overdue: { label: "Vencida", color: "text-[#ef4444]" },
};

type Tab = "roster" | "schedule" | "stats";

export function AcademyxPlayerRoster() {
  const [tab, setTab] = useState<Tab>("roster");
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? PLAYERS : PLAYERS.filter((p) => p.category === filter);

  return (
    <div className="space-y-5">
      {/* header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Jugadores", value: "6", icon: "ph:soccer-ball" },
          { label: "Sub-15", value: "3", icon: "ph:users" },
          { label: "Sub-13", value: "3", icon: "ph:users" },
          { label: "Goles (mes)", value: "30", icon: "ph:target" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <Icon icon={s.icon} className="mb-2 h-5 w-5 text-[#60A5FA]/70" />
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="flex gap-1 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
        {(["roster", "schedule", "stats"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative flex-1 rounded-xl py-2 text-[10px] font-semibold uppercase tracking-[0.3em] transition"
          >
            {tab === t && (
              <motion.div
                layoutId="acx-tab"
                className="absolute inset-0 rounded-xl bg-[#2563EB]/20"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${tab === t ? "text-[#60A5FA]" : "text-white/40"}`}>
              {t === "roster" ? "Plantel" : t === "schedule" ? "Horarios" : "Estadísticas"}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "roster" && (
          <motion.div key="roster" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex gap-2">
              {["all", "Sub-13", "Sub-15"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${
                    filter === cat
                      ? "border-[#2563EB]/50 bg-[#2563EB]/20 text-[#60A5FA]"
                      : "border-white/10 text-white/40 hover:border-white/20"
                  }`}
                >
                  {cat === "all" ? "Todos" : cat}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filtered.map((p) => {
                const ss = STATUS_STYLE[p.status];
                const fs = FEES_STYLE[p.fees];
                return (
                  <div key={p.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/20 text-sm font-bold text-[#60A5FA]">
                        {p.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">{p.name}</p>
                          <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase ${ss.bg} ${ss.text} ${ss.border}`}>
                            {ss.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40">{p.position} · {p.category} · {p.age} años</p>
                        <p className="text-[10px] text-white/25">Tutor: {p.parent}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] font-semibold ${fs.color}`}>{fs.label}</p>
                        <p className="text-[10px] text-white/30">Asistencia: {p.attendance}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {tab === "schedule" && (
          <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {SCHEDULE.map((s) => (
              <div key={s.day + s.category} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#2563EB]/15">
                  <p className="text-[10px] text-[#60A5FA]/60">{s.day.slice(0, 3).toUpperCase()}</p>
                  <Icon icon="ph:clock" className="h-4 w-4 text-[#60A5FA]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{s.category}</p>
                  <p className="text-[10px] text-white/40">{s.time} · {s.field}</p>
                  <p className="text-[10px] text-white/25">Coach: {s.coach}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {tab === "stats" && (
          <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/30">Goleadores</p>
            {[...PLAYERS].sort((a, b) => b.goals - a.goals).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-4 text-center text-[10px] font-bold text-white/30">{i + 1}</span>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/15 text-[10px] font-bold text-[#60A5FA]">
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white">{p.name}</p>
                    <span className="text-xs font-bold text-[#22c55e]">{p.goals} goles</span>
                  </div>
                  <div className="mt-1 h-1 w-full rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(p.goals / 12) * 100}%` }}
                      transition={{ duration: 0.7, delay: i * 0.08 }}
                      className="h-1 rounded-full bg-[#22c55e]/60"
                    />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
