"use client";

import { motion } from "framer-motion";
import { useLang } from "../context/ResumeContext";
import { content } from "../data/content";

const ease = [0.16, 1, 0.3, 1] as const;

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.65, ease, delay: i * 0.07 + 0.2 },
  }),
};

export function AISection() {
  const { lang } = useLang();
  const t = content[lang].ai;

  return (
    <section
      data-bg="dark"
      className="px-6 py-24 sm:px-10"
      style={{ backgroundColor: "#0D1F18", color: "#EEEEE8" }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
          {/* Left — Text */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.9, ease }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.6em]"
              style={{ color: "#C8A96E" }}
              data-accent="gold"
            >
              {t.sectionLabel}
            </p>
            <h2
              className="text-2xl font-bold leading-tight sm:text-3xl"
              style={{ fontFamily: "var(--font-syne)", color: "#EEEEE8", whiteSpace: "pre-line" }}
            >
              {t.heading}
            </h2>
            <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#6B7B72" }}>
              <p>{t.p1}</p>
              <p>{t.p2}</p>
              <p>{t.p3}</p>
            </div>

            <div
              className="rounded-xl border-l-2 p-4"
              style={{ borderColor: "#C8A96E", backgroundColor: "rgba(200,169,110,0.05)" }}
            >
              <p className="text-xs font-semibold leading-relaxed" style={{ color: "#EEEEE8" }}>
                {t.quote}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: "#C8A96E" }}>
                {t.quoteAttrib}
              </p>
            </div>
          </motion.div>

          {/* Right — Mini cards */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
          >
            {t.cards.map((card, i) => (
              <motion.div
                key={card.title}
                custom={i}
                variants={cardVariants}
                whileHover={{ borderColor: "rgba(200,169,110,0.3)", y: -2 }}
                className="rounded-xl border p-4 space-y-2"
                style={{
                  borderColor: "rgba(238,238,232,0.08)",
                  backgroundColor: "rgba(238,238,232,0.025)",
                }}
              >
                <p
                  className="text-xs font-bold"
                  style={{ fontFamily: "var(--font-syne)", color: "#EEEEE8" }}
                >
                  {card.title}
                </p>
                <p className="text-[10px] leading-relaxed" style={{ color: "#6B7B72" }}>
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
