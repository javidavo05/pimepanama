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
    <section id="sectors" className="border-b border-white/10 bg-gradient-to-b from-[#020915] via-[#03040a] to-[#010103] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">Industries</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
          {subheading ? <p className="max-w-3xl text-base text-white/70">{subheading}</p> : null}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {sectors.map((sector, index) => (
            <motion.article
              key={sector.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1730]/60 via-[#080b16]/80 to-[#05060c]/95 p-8 shadow-[0_18px_35px_-28px_rgba(59,130,246,0.65)] transition duration-300 hover:border-[#2563EB]/50 hover:shadow-[0_22px_45px_-24px_rgba(59,130,246,0.7)]"
            >
              <h3 className="text-xl font-semibold text-white">{sector.title}</h3>
              {sector.description ? (
                <p className="mt-4 text-sm leading-relaxed text-white/70">{sector.description}</p>
              ) : null}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

