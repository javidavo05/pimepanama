"use client";

import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useLang } from "../context/ResumeContext";
import { content } from "../data/content";

const ease = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease } },
};

export function ContactSection() {
  const { lang } = useLang();
  const t = content[lang].contact;

  return (
    <section
      data-bg="light"
      className="px-6 py-24 sm:px-10"
      style={{ backgroundColor: "#F5F5F3", color: "#1C1C1C" }}
    >
      <div className="mx-auto max-w-2xl text-center">
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
          className="mb-4 text-3xl font-bold sm:text-4xl"
          style={{ fontFamily: "var(--font-syne)", color: "#1C1C1C" }}
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.05 }}
        >
          {t.heading}
        </motion.h2>
        <motion.p
          className="mx-auto mb-12 max-w-lg text-sm leading-relaxed"
          style={{ color: "#6B7B72" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
        >
          {t.description}
        </motion.p>

        <motion.div
          className="mb-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {t.items.map((c) => (
            <motion.a
              key={c.label}
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noopener noreferrer" : undefined}
              variants={cardVariants}
              whileHover={{
                borderColor: "rgba(200,169,110,0.5)",
                y: -3,
                boxShadow: "0 6px 24px rgba(200,169,110,0.1)",
              }}
              className="no-print-link group flex items-center gap-4 rounded-2xl border p-5"
              style={{ borderColor: "rgba(28,28,28,0.1)", backgroundColor: "#FFFFFF" }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(200,169,110,0.1)", color: "#C8A96E" }}
              >
                <Icon icon={c.icon} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[9px] font-semibold uppercase tracking-[0.4em]"
                  style={{ color: "#6B7B72" }}
                >
                  {c.label}
                </p>
                <p className="truncate text-sm font-semibold" style={{ color: "#1C1C1C" }}>
                  {c.value}
                </p>
              </div>
              <Icon
                icon="ph:arrow-up-right"
                className="h-4 w-4 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ color: "#C8A96E" }}
              />
            </motion.a>
          ))}
        </motion.div>

        {/* Download PDF CTA */}
        <motion.button
          onClick={() => window.print()}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="no-print inline-flex items-center gap-2.5 rounded-full border px-8 py-3.5 text-xs font-bold uppercase tracking-[0.3em] transition-colors duration-300"
          style={{
            borderColor: "rgba(200,169,110,0.4)",
            color: "#8B6A2E",
            backgroundColor: "rgba(200,169,110,0.08)",
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease, delay: 0.3 }}
        >
          <Icon icon="ph:download-simple" className="h-4 w-4" />
          {t.downloadPdf}
        </motion.button>

        {/* Footer note */}
        <p
          className="mt-12 text-[10px] uppercase tracking-[0.4em]"
          style={{ color: "#6B7B72" }}
        >
          {t.footer} · {new Date().getFullYear()}
        </p>
      </div>
    </section>
  );
}
