"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { useInView } from "framer-motion";

function CountUp({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => {
    if (target >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(1)}M${suffix}`;
    if (target >= 1_000) return `${prefix}${Math.round(v / 1_000)}K${suffix}`;
    return `${prefix}${Math.round(v)}${suffix}`;
  });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, target, { duration: 2, ease: "easeOut" });
    return controls.stop;
  }, [inView, count, target]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

export function ValueBanner({ locale }: { locale: "en" | "es" }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden border-y border-[#2563EB]/20 bg-gradient-to-r from-[#030a17] via-[#041020] to-[#030a17] px-6 py-16 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(37,99,235,0.12),_transparent_70%)]" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-4xl font-bold text-white sm:text-5xl">
              <CountUp target={1_135_000} prefix="$" suffix="+" />
            </p>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
              {locale === "es" ? "En software entregado" : "In delivered software"}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-bold text-white sm:text-5xl">
              <CountUp target={8} suffix="+" />
            </p>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
              {locale === "es" ? "Proyectos enterprise" : "Enterprise projects"}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-bold text-white sm:text-5xl">
              <CountUp target={50_000} suffix="+" />
            </p>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
              {locale === "es" ? "Transacciones diarias" : "Daily transactions"}
            </p>
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 text-center text-sm text-white/40"
        >
          {locale === "es"
            ? "Cada proyecto construido con las mejores prácticas de la industria: TypeScript estricto, pruebas E2E, RLS en PostgreSQL y despliegue en Vercel."
            : "Every project built with industry best practices: strict TypeScript, E2E tests, PostgreSQL RLS, and Vercel deployment."}
        </motion.p>
      </div>
    </motion.section>
  );
}
