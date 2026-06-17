"use client";

import { motion } from "framer-motion";
import { useCountUp } from "../hooks/useCountUp";
import { useLang } from "../context/ResumeContext";
import { content } from "../data/content";

const ease = [0.16, 1, 0.3, 1] as const;

function formatCount(raw: number, id: string): string {
  if (id === "mrr") {
    if (raw >= 1_000_000) return `$${(raw / 1_000_000).toFixed(1)}M+`;
    if (raw >= 1_000) return `$${Math.round(raw / 1_000)}K`;
    return `$${raw}`;
  }
  if (id === "files") {
    if (raw >= 1_000) return `${Math.round(raw / 1_000)}K+`;
    return String(raw);
  }
  return `${raw}+`;
}

function StatBlock({
  id,
  target,
  label,
  sublabel,
  delay,
}: {
  id: string;
  target: number;
  label: string;
  sublabel: string;
  delay: number;
}) {
  const { ref, count } = useCountUp(target, 2200);
  return (
    <motion.div
      ref={ref}
      className="space-y-2 py-8 text-center"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.8, ease, delay }}
    >
      <motion.p
        className="text-4xl font-extrabold sm:text-5xl"
        style={{ fontFamily: "var(--font-syne)", color: "#C8A96E" }}
      >
        {formatCount(count, id)}
      </motion.p>
      <p className="text-sm font-semibold" style={{ color: "#EEEEE8" }}>
        {label}
      </p>
      <p className="text-xs" style={{ color: "#6B7B72" }}>
        {sublabel}
      </p>
    </motion.div>
  );
}

export function CoreStats() {
  const { lang } = useLang();
  const t = content[lang].stats;

  return (
    <section
      data-bg="dark"
      className="px-6 py-6 sm:px-10"
      style={{ backgroundColor: "#0D1F18", color: "#EEEEE8" }}
    >
      <div className="mx-auto max-w-5xl">
        <div
          className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0"
          style={{ borderColor: "rgba(200,169,110,0.12)" }}
        >
          <StatBlock id="systems" target={8} label={t.systems.label} sublabel={t.systems.sublabel} delay={0} />
          <StatBlock id="mrr" target={1100000} label={t.mrr.label} sublabel={t.mrr.sublabel} delay={0.1} />
          <StatBlock id="gateways" target={5} label={t.gateways.label} sublabel={t.gateways.sublabel} delay={0.2} />
          <StatBlock id="files" target={53000} label={t.files.label} sublabel={t.files.sublabel} delay={0.3} />
        </div>
      </div>
    </section>
  );
}
