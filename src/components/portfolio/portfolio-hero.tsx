"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Icon } from "@iconify/react";

const stats = [
  { value: "8+", label_en: "Enterprise projects", label_es: "Proyectos enterprise" },
  { value: "$1.1M+", label_en: "In delivered software", label_es: "En software entregado" },
  { value: "3+", label_en: "Years building SaaS", label_es: "Años construyendo SaaS" },
  { value: "5+", label_en: "Payment gateways", label_es: "Pasarelas de pago" },
];

export function PortfolioHero({ locale }: { locale: "en" | "es" }) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#030611] px-6 py-28 text-white">
      {/* bg gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#2563EB]/10 blur-[120px]" />
        <div className="absolute right-1/4 bottom-0 h-80 w-80 translate-x-1/2 rounded-full bg-[#7c3aed]/8 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-white/35"
        >
          <Link href={`/${locale}`} className="transition hover:text-white/60">
            {locale === "es" ? "Inicio" : "Home"}
          </Link>
          <Icon icon="ph:caret-right" className="h-3 w-3" />
          <span className="text-[#60A5FA]">Portfolio</span>
        </motion.div>

        <div className="max-w-3xl space-y-6">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]"
          >
            {locale === "es" ? "Nuestro trabajo" : "Our work"}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            {locale === "es" ? (
              <>Software empresarial<br />construido para{" "}
                <span className="bg-gradient-to-r from-[#2563EB] to-[#60A5FA] bg-clip-text text-transparent">
                  escalar
                </span>
              </>
            ) : (
              <>Enterprise software<br />built to{" "}
                <span className="bg-gradient-to-r from-[#2563EB] to-[#60A5FA] bg-clip-text text-transparent">
                  scale
                </span>
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="text-base leading-relaxed text-white/55 sm:text-lg"
          >
            {locale === "es"
              ? "Construimos SaaS multi-tenant, marketplaces, sistemas de ticketing y plataformas de gestión empresarial con Next.js, Supabase, Stripe y más."
              : "We build multi-tenant SaaS, marketplaces, ticketing systems, and enterprise management platforms with Next.js, Supabase, Stripe, and more."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.26 }}
          >
            <a
              href={`/${locale}#contact`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1d4ed8] to-[#2563EB] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_0_30px_rgba(37,99,235,0.35)] transition hover:shadow-[0_0_40px_rgba(37,99,235,0.5)]"
            >
              {locale === "es" ? "Inicia tu proyecto" : "Start your project"}
              <Icon icon="ph:arrow-right" className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </div>

        {/* stats row */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.07 }}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center"
            >
              <p className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-white/40">
                {locale === "es" ? stat.label_es : stat.label_en}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
