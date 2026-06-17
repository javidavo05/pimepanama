"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

type Guest = {
  id: string;
  name: string;
  rsvp: "confirmed" | "pending" | "declined";
  meal: "chicken" | "fish" | "vegan";
  table: number;
};

const GUESTS: Guest[] = [
  { id: "g1", name: "Ana & Carlos Méndez", rsvp: "confirmed", meal: "chicken", table: 1 },
  { id: "g2", name: "Familia Rodríguez (×4)", rsvp: "confirmed", meal: "fish", table: 2 },
  { id: "g3", name: "Lucía Torres", rsvp: "pending", meal: "vegan", table: 3 },
  { id: "g4", name: "Dr. José Martínez", rsvp: "confirmed", meal: "chicken", table: 1 },
  { id: "g5", name: "María González", rsvp: "declined", meal: "chicken", table: 0 },
  { id: "g6", name: "Roberto & Silvia Vega", rsvp: "confirmed", meal: "fish", table: 4 },
];

const CHECKLIST = [
  { id: "c1", task: "Confirmar floristería", done: true, due: "15 Dic" },
  { id: "c2", task: "Seleccionar menú con chef", done: true, due: "20 Dic" },
  { id: "c3", task: "Enviar invitaciones digitales", done: true, due: "1 Ene" },
  { id: "c4", task: "Confirmar DJ y lista de música", done: false, due: "10 Ene" },
  { id: "c5", task: "Prueba de vestido", done: false, due: "15 Ene" },
  { id: "c6", task: "Reunión con fotógrafo", done: false, due: "20 Ene" },
];

const BUDGET = [
  { category: "Venue", allocated: 8000, spent: 8000 },
  { category: "Catering", allocated: 12000, spent: 9500 },
  { category: "Fotografía", allocated: 3500, spent: 3500 },
  { category: "Flores", allocated: 2000, spent: 1800 },
  { category: "DJ / Música", allocated: 1500, spent: 0 },
  { category: "Vestimenta", allocated: 4000, spent: 2800 },
];

const RSVP_STYLE = {
  confirmed: { label: "Confirmado", bg: "bg-[#22c55e]/15", text: "text-[#22c55e]", border: "border-[#22c55e]/25" },
  pending: { label: "Pendiente", bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", border: "border-[#f59e0b]/25" },
  declined: { label: "Declinó", bg: "bg-[#ef4444]/15", text: "text-[#ef4444]", border: "border-[#ef4444]/25" },
};

type Tab = "guests" | "checklist" | "budget";

export function WeddingSaasPlanner() {
  const [tab, setTab] = useState<Tab>("guests");
  const [checklist, setChecklist] = useState(CHECKLIST);

  const confirmed = GUESTS.filter((g) => g.rsvp === "confirmed").length;
  const pending = GUESTS.filter((g) => g.rsvp === "pending").length;
  const totalBudget = BUDGET.reduce((a, b) => a + b.allocated, 0);
  const totalSpent = BUDGET.reduce((a, b) => a + b.spent, 0);
  const doneTasks = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-5">
      {/* wedding header */}
      <div className="rounded-2xl border border-[#ec4899]/20 bg-gradient-to-r from-[#ec4899]/10 via-[#8b5cf6]/8 to-transparent p-4">
        <p className="text-[10px] uppercase tracking-[0.5em] text-[#f472b6]/60">Boda de</p>
        <h3 className="text-lg font-bold text-white">Sofía & Miguel</h3>
        <p className="text-xs text-white/40">14 de Febrero, 2025 · Hotel Sortis, Panamá</p>
        <div className="mt-3 flex gap-4 text-[10px]">
          <span className="text-[#22c55e]">{confirmed} confirmados</span>
          <span className="text-white/25">·</span>
          <span className="text-[#f59e0b]">{pending} pendientes</span>
          <span className="text-white/25">·</span>
          <span className="text-white/40">{GUESTS.length} invitados</span>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Confirmados", value: `${confirmed}/${GUESTS.length}`, icon: "ph:user-check" },
          { label: "Tareas", value: `${doneTasks}/${checklist.length}`, icon: "ph:check-square" },
          { label: "Presupuesto", value: `${Math.round((totalSpent / totalBudget) * 100)}%`, icon: "ph:wallet" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-center">
            <Icon icon={s.icon} className="mx-auto mb-1 h-4 w-4 text-[#60A5FA]/70" />
            <p className="text-base font-bold text-white">{s.value}</p>
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="flex gap-1 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
        {(["guests", "checklist", "budget"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative flex-1 rounded-xl py-2 text-[10px] font-semibold uppercase tracking-[0.3em] transition"
          >
            {tab === t && (
              <motion.div
                layoutId="wedding-tab"
                className="absolute inset-0 rounded-xl bg-[#ec4899]/20"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${tab === t ? "text-[#f472b6]" : "text-white/40"}`}>
              {t === "guests" ? "Invitados" : t === "checklist" ? "Tareas" : "Presupuesto"}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "guests" && (
          <motion.div key="guests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {GUESTS.map((g) => {
              const rs = RSVP_STYLE[g.rsvp];
              return (
                <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ec4899]/15 text-sm text-[#f472b6]">
                    <Icon icon="ph:heart" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{g.name}</p>
                    <p className="text-[10px] text-white/35">
                      {g.meal === "chicken" ? "Pollo" : g.meal === "fish" ? "Pescado" : "Vegano"}
                      {g.table > 0 ? ` · Mesa ${g.table}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${rs.bg} ${rs.text} ${rs.border}`}>
                    {rs.label}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "checklist" && (
          <motion.div key="checklist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <div className="mb-2 h-2 rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(doneTasks / checklist.length) * 100}%` }}
                className="h-2 rounded-full bg-[#ec4899]/60"
              />
            </div>
            {checklist.map((c) => (
              <button
                key={c.id}
                onClick={() => setChecklist((prev) => prev.map((x) => x.id === c.id ? { ...x, done: !x.done } : x))}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                  c.done ? "border-[#22c55e]/20 bg-[#22c55e]/5" : "border-white/8 bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <Icon
                  icon={c.done ? "ph:check-circle-fill" : "ph:circle"}
                  className={`h-4 w-4 shrink-0 ${c.done ? "text-[#22c55e]" : "text-white/25"}`}
                />
                <p className={`flex-1 text-sm ${c.done ? "text-white/40 line-through" : "text-white"}`}>{c.task}</p>
                <span className="text-[10px] text-white/25">{c.due}</span>
              </button>
            ))}
          </motion.div>
        )}

        {tab === "budget" && (
          <motion.div key="budget" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <div>
                <p className="text-[10px] text-white/30">Presupuesto total</p>
                <p className="text-lg font-bold text-white">${totalBudget.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/30">Gastado</p>
                <p className="text-lg font-bold text-[#f472b6]">${totalSpent.toLocaleString()}</p>
              </div>
            </div>
            {BUDGET.map((b, i) => {
              const pct = b.allocated > 0 ? (b.spent / b.allocated) * 100 : 0;
              return (
                <div key={b.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">{b.category}</span>
                    <span className="text-white/40">${b.spent.toLocaleString()} / ${b.allocated.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.7, delay: i * 0.08 }}
                      className={`h-1.5 rounded-full ${pct >= 100 ? "bg-[#ef4444]/60" : "bg-[#ec4899]/60"}`}
                    />
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
