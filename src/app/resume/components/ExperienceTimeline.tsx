"use client";

import { motion } from "framer-motion";
import { useLang } from "../context/ResumeContext";
import { content } from "../data/content";

const ease = [0.16, 1, 0.3, 1] as const;

export function ExperienceTimeline() {
  const { lang } = useLang();
  const t = content[lang].experience;

  return (
    <section
      data-bg="light"
      className="px-6 py-24 sm:px-10"
      style={{ backgroundColor: "#F5F5F3", color: "#1C1C1C" }}
    >
      <div className="mx-auto max-w-4xl">
        <motion.p
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.6em]"
          style={{ color: "#C8A96E" }}
          data-accent="gold"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
        >
          {t.sectionLabel}
        </motion.p>
        <motion.h2
          className="mb-14 text-2xl font-bold sm:text-3xl"
          style={{ fontFamily: "var(--font-syne)", color: "#1C1C1C" }}
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.05 }}
        >
          {t.heading}
        </motion.h2>

        <div className="space-y-0">
          {t.entries.map((entry, i) => (
            <motion.div
              key={i}
              className="grid grid-cols-[70px_1fr] gap-4 sm:grid-cols-[110px_1fr] sm:gap-6"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease, delay: i * 0.1 }}
            >
              {/* Left — date */}
              <div className="pt-1 text-right">
                <span
                  className="text-[10px] font-semibold leading-relaxed"
                  style={{ color: "#C8A96E" }}
                  data-accent="gold"
                >
                  {entry.period}
                </span>
              </div>

              {/* Right — content */}
              <div
                className="relative pb-12 pl-6"
                style={{ borderLeft: `1px solid rgba(200,169,110,0.2)` }}
              >
                {/* Timeline dot */}
                <div
                  className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2"
                  style={{ borderColor: "#C8A96E", backgroundColor: "#F5F5F3" }}
                />

                <h3
                  className="text-sm font-bold leading-tight"
                  style={{ fontFamily: "var(--font-syne)", color: "#1C1C1C" }}
                >
                  {entry.role}
                </h3>
                <p
                  className="mb-3 mt-0.5 text-xs font-semibold uppercase tracking-[0.3em]"
                  style={{ color: "#C8A96E" }}
                  data-accent="gold"
                >
                  {entry.company}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7B72" }}>
                  {entry.description}
                </p>
                {entry.highlight ? (
                  <div
                    className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1"
                    style={{
                      backgroundColor: "rgba(200,169,110,0.1)",
                      border: "1px solid rgba(200,169,110,0.25)",
                    }}
                  >
                    <span
                      className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                      style={{ color: "#8B6A2E" }}
                    >
                      {entry.highlight}
                    </span>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
