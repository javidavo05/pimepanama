"use client";

import { motion } from "framer-motion";
import { useLang } from "../context/ResumeContext";
import { content } from "../data/content";

const ease = [0.16, 1, 0.3, 1] as const;

export function IndustriesSection() {
  const { lang } = useLang();
  const t = content[lang].industries;

  return (
    <section
      data-bg="dark"
      className="px-6 py-24 sm:px-10"
      style={{ backgroundColor: "#0D1F18", color: "#EEEEE8" }}
    >
      <div className="mx-auto max-w-5xl text-center">
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
          className="mb-3 text-2xl font-bold sm:text-3xl"
          style={{ fontFamily: "var(--font-syne)", color: "#EEEEE8" }}
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.05 }}
        >
          {t.heading}
        </motion.h2>
        <motion.p
          className="mx-auto mb-14 max-w-xl text-sm leading-relaxed"
          style={{ color: "#6B7B72" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
        >
          {t.subheading}
        </motion.p>

        <motion.div
          className="flex flex-wrap justify-center gap-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {t.items.map((ind) => (
            <motion.span
              key={ind.label}
              variants={{
                hidden: { opacity: 0, scale: 0.8, y: 12 },
                show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease } },
              }}
              whileHover={{ scale: 1.07 }}
              className="rounded-full border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.3em] cursor-default"
              style={{
                borderColor: ind.primary ? "rgba(200,169,110,0.3)" : "rgba(238,238,232,0.1)",
                color: ind.primary ? "#EEEEE8" : "#6B7B72",
                backgroundColor: ind.primary ? "rgba(200,169,110,0.05)" : "rgba(238,238,232,0.02)",
              }}
            >
              {ind.label}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
