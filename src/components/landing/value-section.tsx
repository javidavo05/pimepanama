"use client";

import { motion } from "framer-motion";

export function ValueSection({
  heading,
  body,
}: {
  heading: string;
  body?: string | null;
}) {
  return (
    <section className="border-b border-white/10 bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Our Promise</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
        </div>
        {body ? (
          <motion.p
            className="text-lg leading-relaxed text-white/60 md:text-xl"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            {body}
          </motion.p>
        ) : null}
      </div>
    </section>
  );
}

