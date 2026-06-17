"use client";

import { motion } from "framer-motion";

type Sector = {
  id: string;
  title: string;
  description?: string | null;
};

export function SectorsSection({
  heading,
  subheading,
  sectors,
}: {
  heading: string;
  subheading?: string | null;
  sectors: Sector[];
}) {
  return (
    <section
      id="sectors"
      className="border-b border-white/10 px-6 py-24 text-white"
      style={{ background: "#030611" }}
    >
      <div className="mx-auto max-w-6xl space-y-12">
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">Industrias</p>
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {heading}
          </h2>
          {subheading ? <p className="max-w-3xl text-base text-white/70">{subheading}</p> : null}
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector, index) => (
            <motion.article
              key={sector.id}
              initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.055, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="group rounded-xl p-6 transition duration-300"
              style={{
                background: "rgba(8,14,32,0.6)",
                border: "1px solid rgba(37,99,235,0.12)",
              }}
              whileHover={{
                borderColor: "rgba(37,99,235,0.35)",
                background: "rgba(12,21,48,0.8)",
              }}
            >
              <h3 className="text-base font-semibold text-white">{sector.title}</h3>
              {sector.description ? (
                <p className="mt-2 text-sm leading-relaxed text-white/60">{sector.description}</p>
              ) : null}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
