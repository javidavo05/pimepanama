"use client";

import { motion } from "framer-motion";
import { useLang } from "../context/ResumeContext";
import { content } from "../data/content";

const ease = [0.16, 1, 0.3, 1] as const;

const ICONS = [
  <svg key="fs" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <path d="M4 6l-2 2 2 2M16 6l2 2-2 2M12 3l-4 14" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  <svg key="mt" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <rect x="2" y="3" width="16" height="5" rx="1.5" />
    <rect x="2" y="12" width="7" height="5" rx="1.5" />
    <rect x="11" y="12" width="7" height="5" rx="1.5" />
  </svg>,
  <svg key="pay" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <rect x="1" y="5" width="18" height="12" rx="2" />
    <path d="M1 9h18" strokeLinecap="round" />
    <path d="M5 13h4" strokeLinecap="round" />
  </svg>,
  <svg key="bi" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <circle cx="10" cy="10" r="8" />
    <path d="M10 2a14 14 0 010 16M2 10h16" strokeLinecap="round" />
  </svg>,
  <svg key="pwa" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <rect x="5" y="2" width="10" height="16" rx="2" />
    <circle cx="10" cy="15" r="1" fill="currentColor" stroke="none" />
  </svg>,
  <svg key="ri" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <path d="M3 10a7 7 0 0114 0" strokeLinecap="round" />
    <path d="M17 10l-2-2.5M17 10l-2 2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 14l1.5 1.5L6 14" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease } },
};

export function ValueProp() {
  const { lang } = useLang();
  const t = content[lang].valueProp;

  return (
    <section
      data-bg="light"
      className="px-6 py-24 sm:px-10"
      style={{ backgroundColor: "#F5F5F3", color: "#1C1C1C" }}
    >
      <div className="mx-auto max-w-5xl">
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
          style={{ fontFamily: "var(--font-syne)", color: "#1C1C1C" }}
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.05 }}
        >
          {t.heading}
        </motion.h2>
        <motion.p
          className="mb-14 max-w-2xl text-sm leading-relaxed"
          style={{ color: "#6B7B72" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
        >
          {t.subheading}
        </motion.p>

        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {t.cards.map((card, i) => (
            <motion.article
              key={card.title}
              data-card
              variants={cardVariants}
              whileHover={{ y: -4, boxShadow: "0 8px 32px rgba(200,169,110,0.12)" }}
              className="rounded-2xl border p-6 cursor-default"
              style={{ borderColor: "rgba(28,28,28,0.1)", backgroundColor: "#FFFFFF" }}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(200,169,110,0.1)", color: "#C8A96E" }}
              >
                {ICONS[i]}
              </div>
              <h3
                className="mb-2 text-sm font-bold"
                style={{ fontFamily: "var(--font-syne)", color: "#1C1C1C" }}
              >
                {card.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "#6B7B72" }}>
                {card.description}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
