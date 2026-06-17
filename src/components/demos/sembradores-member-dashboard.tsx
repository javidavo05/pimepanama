"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

type Member = {
  id: string;
  name: string;
  email: string;
  ministry: string;
  status: "active" | "inactive" | "new";
  joinDate: string;
  tithe: number;
};

const MEMBERS: Member[] = [
  { id: "m1", name: "Ana María López", email: "ana@iglesia.org", ministry: "Alabanza", status: "active", joinDate: "2021-03-15", tithe: 250 },
  { id: "m2", name: "Roberto Sánchez", email: "roberto@iglesia.org", ministry: "Jóvenes", status: "active", joinDate: "2022-06-01", tithe: 150 },
  { id: "m3", name: "María Fernanda Cruz", email: "mfc@iglesia.org", ministry: "Educación", status: "new", joinDate: "2024-11-20", tithe: 0 },
  { id: "m4", name: "Jorge Luis Martínez", email: "jorge@iglesia.org", ministry: "Ujieres", status: "inactive", joinDate: "2020-01-10", tithe: 0 },
  { id: "m5", name: "Carmen Delgado", email: "carmen@iglesia.org", ministry: "Damas", status: "active", joinDate: "2019-08-22", tithe: 350 },
];

const MINISTRIES = [
  { name: "Alabanza", members: 12, color: "bg-[#8b5cf6]/20 text-[#a78bfa]" },
  { name: "Jóvenes", members: 28, color: "bg-[#2563EB]/20 text-[#60A5FA]" },
  { name: "Educación", members: 9, color: "bg-[#22c55e]/20 text-[#4ade80]" },
  { name: "Ujieres", members: 15, color: "bg-[#f59e0b]/20 text-[#fbbf24]" },
  { name: "Damas", members: 22, color: "bg-[#ec4899]/20 text-[#f472b6]" },
];

const TRANSACTIONS = [
  { id: "t1", member: "Ana María López", type: "Diezmo", amount: 250, date: "2024-12-01", method: "Yappy" },
  { id: "t2", member: "Carmen Delgado", type: "Ofrenda", amount: 100, date: "2024-12-01", method: "Efectivo" },
  { id: "t3", member: "Roberto Sánchez", type: "Diezmo", amount: 150, date: "2024-11-24", method: "Banco General" },
  { id: "t4", member: "Ana María López", type: "Misiones", amount: 75, date: "2024-11-17", method: "Yappy" },
];

const STATUS_STYLE = {
  active: { label: "Activo", bg: "bg-[#22c55e]/15", text: "text-[#22c55e]", border: "border-[#22c55e]/25" },
  inactive: { label: "Inactivo", bg: "bg-white/5", text: "text-white/40", border: "border-white/10" },
  new: { label: "Nuevo", bg: "bg-[#2563EB]/15", text: "text-[#60A5FA]", border: "border-[#2563EB]/25" },
};

type Tab = "members" | "finances" | "ministries";

export function SembradoresMemberDashboard() {
  const [tab, setTab] = useState<Tab>("members");
  const [search, setSearch] = useState("");

  const filtered = MEMBERS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.ministry.toLowerCase().includes(search.toLowerCase())
  );

  const totalTithes = TRANSACTIONS.filter((t) => t.type === "Diezmo").reduce((a, b) => a + b.amount, 0);
  const totalOfferings = TRANSACTIONS.filter((t) => t.type !== "Diezmo").reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-5">
      {/* stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Miembros", value: "86", icon: "ph:users-three" },
          { label: "Ministerios", value: "5", icon: "ph:church" },
          { label: "Diezmos (mes)", value: "$1,240", icon: "ph:currency-dollar" },
          { label: "Asistencia", value: "73%", icon: "ph:chart-line-up" },
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
        {(["members", "finances", "ministries"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative flex-1 rounded-xl py-2 text-[10px] font-semibold uppercase tracking-[0.3em] transition"
          >
            {tab === t && (
              <motion.div
                layoutId="sembradores-tab"
                className="absolute inset-0 rounded-xl bg-[#2563EB]/20"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${tab === t ? "text-[#60A5FA]" : "text-white/40"}`}>
              {t === "members" ? "Miembros" : t === "finances" ? "Finanzas" : "Ministerios"}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "members" && (
          <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar miembro o ministerio…"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#2563EB]/40"
              />
            </div>
            <div className="space-y-2">
              {filtered.map((m) => {
                const s = STATUS_STYLE[m.status];
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/20 text-sm font-bold text-[#60A5FA]">
                      {m.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{m.name}</p>
                      <p className="text-[10px] text-white/40">{m.ministry} · {m.email}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${s.bg} ${s.text} ${s.border}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {tab === "finances" && (
          <motion.div key="finances" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/8 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#22c55e]/60">Diezmos (mes)</p>
                <p className="text-2xl font-bold text-[#22c55e]">${totalTithes.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-[#60A5FA]/20 bg-[#60A5FA]/8 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#60A5FA]/60">Ofrendas</p>
                <p className="text-2xl font-bold text-[#60A5FA]">${totalOfferings.toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-2">
              {TRANSACTIONS.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/15">
                    <Icon icon="ph:currency-dollar" className="h-4 w-4 text-[#60A5FA]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">{t.member}</p>
                    <p className="text-[10px] text-white/40">{t.type} · {t.method} · {t.date}</p>
                  </div>
                  <span className="text-sm font-bold text-[#22c55e]">${t.amount}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "ministries" && (
          <motion.div key="ministries" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {MINISTRIES.map((min, i) => (
              <div key={min.name} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${min.color}`}>
                  <Icon icon="ph:users" className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{min.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(min.members / 28) * 100}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1 }}
                        className="h-1 rounded-full bg-[#2563EB]/60"
                      />
                    </div>
                    <span className="text-[10px] text-white/40">{min.members} miembros</span>
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
