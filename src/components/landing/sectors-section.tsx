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
    <section id="sectors" className="border-b border-white/10 bg-[#050505] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Industries</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
          {subheading ? <p className="max-w-3xl text-base text-white/60">{subheading}</p> : null}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {sectors.map((sector, index) => (
            <motion.article
              key={sector.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur"
            >
              <h3 className="text-xl font-semibold text-white">{sector.title}</h3>
              {sector.description ? (
                <p className="mt-4 text-sm leading-relaxed text-white/60">{sector.description}</p>
              ) : null}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

