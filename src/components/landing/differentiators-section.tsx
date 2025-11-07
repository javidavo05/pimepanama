"use client";

import { motion } from "framer-motion";

type Differentiator = {
  id: string;
  title: string;
  description: string;
};

export function DifferentiatorsSection({
  heading,
  subheading,
  items,
}: {
  heading: string;
  subheading?: string | null;
  items: Differentiator[];
}) {
  return (
    <section id="differentiators" className="border-b border-white/10 bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Why PIME</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
          {subheading ? <p className="max-w-3xl text-base text-white/60">{subheading}</p> : null}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-transparent to-white/0 p-8 backdrop-blur"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-white/60">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

