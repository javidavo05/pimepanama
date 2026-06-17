"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { WeddingSaasPlanner } from "@/components/demos/wedding-saas-planner";

const TECH = ["Next.js 16", "React 19", "Supabase", "Tailwind v4", "next-intl", "PWA", "Serwist", "dnd-kit"];

export default function WeddingSaasDemoPage({ params }: { params: { locale: string } }) {
  const locale = params.locale === "es" ? "es" : "en";

  return (
    <div className="min-h-screen bg-[#030611] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <nav className="mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/30">
          <Link href={`/${locale}`} className="transition hover:text-white/60">Home</Link>
          <span>/</span>
          <Link href={`/${locale}/portfolio`} className="transition hover:text-white/60">Portfolio</Link>
          <span>/</span>
          <span className="text-[#60A5FA]">Wedding SaaS Demo</span>
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
              $200K project
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Wedding SaaS — Multi-tenant Wedding Platform
          </h1>
          <p className="max-w-2xl text-base text-white/55">
            White-label wedding planning SaaS with 7-locale support, audio invitations, guest galleries,
            package-based billing, and a Godmode admin control plane.
          </p>
          <p className="text-xs text-white/30">11,577 TypeScript files · 708 routes · 7 locales · Multi-tenant RLS</p>
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
              Interactive demo — wedding planner dashboard
            </span>
          </div>
          <WeddingSaasPlanner />
        </motion.div>

        <div className="mt-8">
          <Link
            href={`/${locale}/portfolio`}
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
