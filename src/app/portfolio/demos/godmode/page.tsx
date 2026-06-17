"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useLocale } from "next-intl";
import { GodmodeControlCenter } from "@/components/demos/godmode-control-center";

const TECH = ["Next.js 16", "React 19", "Supabase", "Tailwind v4", "Recharts", "Dodo Payments", "Resend", "Vitest"];

export default function GodmodeDemoPage() {
  const locale = useLocale() === "es" ? "es" : "en";

  return (
    <div className="min-h-screen bg-[#030611] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <nav className="mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/30">
          <Link href="/" className="transition hover:text-white/60">Home</Link>
          <span>/</span>
          <Link href="/portfolio" className="transition hover:text-white/60">Portfolio</Link>
          <span>/</span>
          <span className="text-[#60A5FA]">Godmode Demo</span>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#22c55e]/40 bg-[#22c55e]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#22c55e]">
              ● Live Demo
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/40">
              SaaS · 2024
            </span>
            <span className="rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#f59e0b]">
              $115K project
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Godmode — B2B SaaS Control Center
          </h1>
          <p className="max-w-2xl text-base text-white/55">
            Unified B2B dashboard managing digital subscriptions, automotive inventory, and company
            hierarchies across multiple organizations — with Dodo Payments billing and HMAC-signed webhooks.
          </p>
          <p className="text-xs text-white/30">3 business modules · Multi-company RLS · Control plane webhooks</p>
          <div className="flex flex-wrap gap-1.5">
            {TECH.map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">{t}</span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#22c55e]" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-white/40">
              Interactive demo — B2B control center
            </span>
          </div>
          <GodmodeControlCenter />
        </motion.div>

        <div className="mt-8">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40 transition hover:text-white/70"
          >
            <Icon icon="ph:arrow-left" className="h-3.5 w-3.5" />
            {locale === "es" ? "Volver al portfolio" : "Back to portfolio"}
          </Link>
        </div>
      </div>
    </div>
  );
}
