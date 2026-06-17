"use client";

import { motion } from "framer-motion";
import { useLang } from "../context/ResumeContext";
import { content } from "../data/content";

const ease = [0.16, 1, 0.3, 1] as const;

export function ExecutiveSummary() {
  const { lang } = useLang();
  const t = content[lang].summary;

  return (
    <section
      data-bg="light"
      className="px-6 py-24 sm:px-10"
      style={{ backgroundColor: "#F5F5F3", color: "#1C1C1C" }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start">
          {/* Photo column */}
          <motion.div
            className="relative mx-auto w-full max-w-xs md:max-w-none"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease }}
          >
            <div className="relative aspect-[3/4]">
              {/* Gold offset border */}
              <div
                className="absolute -bottom-3 -right-3 h-full w-full rounded-2xl border-2"
                style={{ borderColor: "#C8A96E" }}
              />
              {/* Photo */}
              <img
                src="/resume/javier-vallejo.jpg"
                alt="Javier Vallejo"
                className="relative z-10 h-full w-full object-cover object-top rounded-2xl"
              />
            </div>
          </motion.div>

          {/* Text column */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease, delay: 0.1 }}
          >
            <p
              className="mb-3 text-[10px] font-semibold uppercase tracking-[0.6em]"
              style={{ color: "#C8A96E" }}
              data-accent="gold"
            >
              {t.sectionLabel}
            </p>
            <h2
              className="mb-6 text-2xl font-bold leading-tight sm:text-3xl"
              style={{ fontFamily: "var(--font-syne)", color: "#1C1C1C" }}
            >
              {t.heading}
            </h2>

            <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#6B7B72" }}>
              <p>{t.p1}</p>
              <p>{t.p2}</p>
              <p>{t.p3}</p>
              <p>{t.p4}</p>
            </div>

            {/* Tag pills */}
            <div className="mt-8 flex flex-wrap gap-2">
              {t.tags.map((tag) => (
                <motion.span
                  key={tag}
                  whileHover={{ scale: 1.06 }}
                  className="rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] cursor-default"
                  style={{
                    borderColor: "rgba(200,169,110,0.3)",
                    color: "#1C1C1C",
                    backgroundColor: "rgba(200,169,110,0.05)",
                  }}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
