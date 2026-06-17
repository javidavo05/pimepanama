"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useLocale } from "next-intl";
import { NavigationBar } from "@/components/landing/navigation-bar";
import { LandingFooter } from "@/components/landing/footer";
import { TdpSeatSelectorDemo } from "@/components/demos/tdp-seat-selector";
import { TdpFinancialDashboard } from "@/components/demos/tdp-financial-dashboard";
import type { Locale } from "@/lib/i18n";

const TABS = [
  { id: "tickets", label: "Compra de Ticket", icon: "ph:ticket" },
  { id: "financial", label: "Dashboard Financiero", icon: "ph:chart-bar" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function TdpDemoPage() {
  const rawLocale = useLocale();
  const locale = (rawLocale === "es" ? "es" : "en") as Locale;
  const [activeTab, setActiveTab] = useState<TabId>("tickets");

  const navItems = [
    { label: locale === "es" ? "Servicios" : "Services", href: "/#services" },
    { label: locale === "es" ? "Portafolio" : "Portfolio", href: "/portfolio" },
    { label: locale === "es" ? "Contacto" : "Contact", href: "/#contact" },
  ];

  return (
    <>
      <NavigationBar locale={locale} items={navItems} />
      <main className="min-h-screen bg-[#030611] text-white">
        <div className="relative overflow-hidden border-b border-white/10 px-6 py-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.12),_transparent_70%)]" />
          <div className="relative z-10 mx-auto max-w-4xl">
            <div className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.4em] text-white/30">
              <Link href="/" className="hover:text-white/60 transition-colors">
                {locale === "es" ? "Inicio" : "Home"}
              </Link>
              <Icon icon="ph:caret-right" className="h-3 w-3" />
              <Link href="/portfolio" className="hover:text-white/60 transition-colors">Portfolio</Link>
              <Icon icon="ph:caret-right" className="h-3 w-3" />
              <span className="text-[#60A5FA]">TDP Demo</span>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#22c55e]">
                    Live Demo
                  </span>
                  <span className="rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f59e0b]">
                    Est. $275K
                  </span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  TDP — Transporte Digital Panameño
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-white/50">
                  Sistema nacional de ticketing de buses: portal web + terminales POS Electron + rastreo GPS en tiempo real.
                  Integrado con 5+ pasarelas de pago panameñas.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {["Next.js 14", "Electron", "Supabase", "Yappy", "PagueloFacil", "GPS", "PWA", "TypeScript"].map((t) => (
                <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-white/50">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 px-6">
          <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto py-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#2563EB]/15 text-[#60A5FA]"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="demo-tab-bg"
                    className="absolute inset-0 rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon icon={tab.icon} className="relative h-3.5 w-3.5" />
                <span className="relative">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-10">
          <div className="mx-auto max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8"
              >
                {activeTab === "tickets" && <TdpSeatSelectorDemo />}
                {activeTab === "financial" && <TdpFinancialDashboard />}
              </motion.div>
            </AnimatePresence>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-white">¿Quieres algo similar para tu negocio?</p>
                <p className="text-xs text-white/40">Construimos sistemas complejos a medida.</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/portfolio"
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/50 hover:text-white transition-colors"
                >
                  ← Ver más proyectos
                </Link>
                <Link
                  href="/#contact"
                  className="rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563EB] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
                >
                  Contactar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter locale={locale} />
    </>
  );
}
