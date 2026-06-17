"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

type Company = {
  id: string;
  name: string;
  module: "digital" | "automotive" | "holdings";
  plan: "starter" | "pro" | "enterprise";
  mrr: number;
  users: number;
  status: "active" | "trial" | "churned";
};

const COMPANIES: Company[] = [
  { id: "c1", name: "TechFlow Solutions", module: "digital", plan: "enterprise", mrr: 1499, users: 84, status: "active" },
  { id: "c2", name: "AutoMax Panamá", module: "automotive", plan: "pro", mrr: 699, users: 12, status: "active" },
  { id: "c3", name: "Grupo Inversiones Pacífico", module: "holdings", plan: "enterprise", mrr: 1999, users: 5, status: "active" },
  { id: "c4", name: "DataSync Corp", module: "digital", plan: "starter", mrr: 0, users: 3, status: "trial" },
  { id: "c5", name: "CarDirect Panama", module: "automotive", plan: "pro", mrr: 699, users: 7, status: "active" },
];

const MODULE_STYLE: Record<Company["module"], { label: string; icon: string; color: string }> = {
  digital: { label: "Digital", icon: "ph:cloud", color: "text-[#60A5FA] bg-[#2563EB]/15" },
  automotive: { label: "Automotriz", icon: "ph:car", color: "text-[#f59e0b] bg-[#f59e0b]/15" },
  holdings: { label: "Holdings", icon: "ph:buildings", color: "text-[#a78bfa] bg-[#8b5cf6]/15" },
};

const STATUS_STYLE = {
  active: { label: "Activo", text: "text-[#22c55e]", border: "border-[#22c55e]/25 bg-[#22c55e]/10" },
  trial: { label: "Trial", text: "text-[#f59e0b]", border: "border-[#f59e0b]/25 bg-[#f59e0b]/10" },
  churned: { label: "Churned", text: "text-white/30", border: "border-white/10 bg-white/5" },
};

const PLAN_BADGE = {
  starter: "text-white/40 border-white/10",
  pro: "text-[#60A5FA] border-[#2563EB]/25",
  enterprise: "text-[#a78bfa] border-[#8b5cf6]/25",
};

const WEBHOOKS = [
  { event: "subscription.created", company: "DataSync Corp", time: "12:03:45", status: "delivered" },
  { event: "payment.succeeded", company: "AutoMax Panamá", time: "11:55:02", status: "delivered" },
  { event: "user.invited", company: "TechFlow Solutions", time: "11:30:17", status: "delivered" },
  { event: "subscription.upgraded", company: "CarDirect Panama", time: "10:12:44", status: "failed" },
];

type Tab = "companies" | "analytics" | "webhooks";

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}

export function GodmodeControlCenter() {
  const [tab, setTab] = useState<Tab>("companies");
  const [moduleFilter, setModuleFilter] = useState<"all" | Company["module"]>("all");

  const filtered = moduleFilter === "all" ? COMPANIES : COMPANIES.filter((c) => c.module === moduleFilter);
  const totalMRR = COMPANIES.filter((c) => c.status === "active").reduce((a, b) => a + b.mrr, 0);
  const activeCount = COMPANIES.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-center justify-between rounded-2xl border border-[#8b5cf6]/20 bg-gradient-to-r from-[#8b5cf6]/10 to-transparent p-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.5em] text-[#a78bfa]/60">Godmode</p>
          <h3 className="text-lg font-bold text-white">Control Center</h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8b5cf6]/20">
          <Icon icon="ph:lightning" className="h-5 w-5 text-[#a78bfa]" />
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "MRR", value: fmt(totalMRR), icon: "ph:currency-dollar" },
          { label: "Empresas activas", value: String(activeCount), icon: "ph:buildings" },
          { label: "Usuarios totales", value: String(COMPANIES.reduce((a, b) => a + b.users, 0)), icon: "ph:users" },
          { label: "Webhooks hoy", value: "47", icon: "ph:webhooks-logo" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <Icon icon={s.icon} className="mb-2 h-5 w-5 text-[#a78bfa]/70" />
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="flex gap-1 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
        {(["companies", "analytics", "webhooks"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative flex-1 rounded-xl py-2 text-[10px] font-semibold uppercase tracking-[0.3em] transition"
          >
            {tab === t && (
              <motion.div
                layoutId="godmode-tab"
                className="absolute inset-0 rounded-xl bg-[#8b5cf6]/20"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${tab === t ? "text-[#a78bfa]" : "text-white/40"}`}>
              {t === "companies" ? "Empresas" : t === "analytics" ? "Analítica" : "Webhooks"}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "companies" && (
          <motion.div key="companies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex gap-2">
              {(["all", "digital", "automotive", "holdings"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModuleFilter(m)}
                  className={`rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-wide transition ${
                    moduleFilter === m
                      ? "border-[#8b5cf6]/50 bg-[#8b5cf6]/20 text-[#a78bfa]"
                      : "border-white/10 text-white/40 hover:border-white/20"
                  }`}
                >
                  {m === "all" ? "Todos" : MODULE_STYLE[m as Company["module"]].label}
                </button>
              ))}
            </div>
            {filtered.map((c) => {
              const ms = MODULE_STYLE[c.module];
              const ss = STATUS_STYLE[c.status];
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ms.color}`}>
                    <Icon icon={ms.icon} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase ${PLAN_BADGE[c.plan]}`}>
                        {c.plan}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/35">{ms.label} · {c.users} usuarios</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{c.mrr > 0 ? fmt(c.mrr) : "—"}/mo</p>
                    <span className={`text-[9px] font-bold ${ss.text}`}>{ss.label}</span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "analytics" && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/30">MRR por módulo</p>
              <div className="space-y-3">
                {(["digital", "automotive", "holdings"] as const).map((m) => {
                  const ms = MODULE_STYLE[m];
                  const mrr = COMPANIES.filter((c) => c.module === m && c.status === "active").reduce((a, b) => a + b.mrr, 0);
                  const pct = totalMRR > 0 ? (mrr / totalMRR) * 100 : 0;
                  return (
                    <div key={m} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/60">{ms.label}</span>
                        <span className="font-semibold text-white">{fmt(mrr)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }}
                          className={`h-2 rounded-full ${m === "digital" ? "bg-[#2563EB]/70" : m === "automotive" ? "bg-[#f59e0b]/70" : "bg-[#8b5cf6]/70"}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Churn rate", value: "2.1%", trend: "↓ good" },
                { label: "ARPU", value: fmt(Math.round(totalMRR / activeCount)), trend: "↑" },
                { label: "LTV", value: "$28.4K", trend: "↑" },
              ].map((m) => (
                <div key={m.label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-center">
                  <p className="text-base font-bold text-white">{m.value}</p>
                  <p className="text-[9px] text-[#22c55e]">{m.trend}</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">{m.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "webhooks" && (
          <motion.div key="webhooks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/30">Control plane events (HMAC signed)</p>
            {WEBHOOKS.map((w) => (
              <div key={w.event + w.time} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${w.status === "delivered" ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono font-medium text-white/80">{w.event}</p>
                  <p className="text-[10px] text-white/30">{w.company}</p>
                </div>
                <div className="text-right">
                  <p className={`text-[9px] font-semibold uppercase ${w.status === "delivered" ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {w.status}
                  </p>
                  <p className="text-[10px] text-white/25">{w.time}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
