"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type CTA = {
  id: string;
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  buttonLabel?: string | null;
  buttonLink?: string | null;
};

export function CallToActionSection({
  heading,
  subheading,
  ctas,
}: {
  heading: string;
  subheading?: string | null;
  ctas: CTA[];
}) {
  return (
    <section id="contact" className="border-b border-white/10 bg-gradient-to-b from-[#010712] via-[#02030a] to-[#010103] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">Engage</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
          {subheading ? <p className="max-w-3xl text-base text-white/70">{subheading}</p> : null}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {ctas.map((cta, index) => (
            <motion.article
              key={cta.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1730]/60 via-[#090c16]/80 to-[#05070c]/95 p-8 shadow-[0_18px_35px_-28px_rgba(59,130,246,0.6)] transition duration-300 hover:border-[#2563EB]/50 hover:shadow-[0_20px_45px_-24px_rgba(59,130,246,0.65)]"
            >
              {cta.eyebrow ? (
                <span className="text-xs uppercase tracking-[0.4em] text-[#60A5FA]">{cta.eyebrow}</span>
              ) : null}
              <h3 className="text-lg font-semibold text-white">{cta.title}</h3>
              {cta.description ? (
                <p className="text-sm leading-relaxed text-white/70">{cta.description}</p>
              ) : null}
              {cta.buttonLabel && cta.buttonLink ? (
                <Link
                  href={cta.buttonLink}
                  className="mt-auto inline-flex items-center justify-center rounded-full border border-[#2563EB]/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-[#2563EB]/70 hover:text-white"
                >
                  {cta.buttonLabel}
                </Link>
              ) : null}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

