"use client";

import { motion } from "framer-motion";
import { useLang } from "../context/ResumeContext";
import { content } from "../data/content";

const ease = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const groupVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export function TechExpertise() {
  const { lang } = useLang();
  const t = content[lang].tech;

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
          className="mb-14 text-2xl font-bold sm:text-3xl"
          style={{ fontFamily: "var(--font-syne)", color: "#1C1C1C" }}
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.05 }}
        >
          {t.heading}
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.08 }}
        >
          {t.groups.map((group) => (
            <motion.div key={group.title} variants={groupVariants}>
              <p
                className="mb-3 text-[10px] font-semibold uppercase tracking-[0.5em]"
                style={{ color: "#C8A96E" }}
                data-accent="gold"
              >
                {group.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <motion.span
                    key={skill}
                    whileHover={{ scale: 1.07 }}
                    className="rounded-full border px-2.5 py-1 text-[10px] font-medium cursor-default"
                    style={{
                      borderColor: "rgba(28,28,28,0.12)",
                      backgroundColor: "rgba(200,169,110,0.07)",
                      color: "#3A3A3A",
                    }}
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
