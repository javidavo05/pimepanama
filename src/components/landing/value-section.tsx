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
    <section className="border-b border-white/10 bg-gradient-to-b from-[#020711] via-[#02040a] to-[#010103] px-6 py-24 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">Our Promise</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{heading}</h2>
        </div>
        {body ? (
          <motion.p
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1628]/50 via-[#05070f]/70 to-transparent p-8 text-lg leading-relaxed text-white/70 shadow-[0_18px_45px_-30px_rgba(37,99,235,0.5)] md:text-xl"
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

