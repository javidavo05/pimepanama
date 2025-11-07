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
    <section id="contact" className="border-b border-white/10 bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Engage</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
          {subheading ? <p className="max-w-3xl text-base text-white/60">{subheading}</p> : null}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {ctas.map((cta, index) => (
            <motion.article
              key={cta.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8 backdrop-blur"
            >
              {cta.eyebrow ? (
                <span className="text-xs uppercase tracking-[0.4em] text-emerald-400/80">{cta.eyebrow}</span>
              ) : null}
              <h3 className="text-lg font-semibold text-white">{cta.title}</h3>
              {cta.description ? (
                <p className="text-sm leading-relaxed text-white/60">{cta.description}</p>
              ) : null}
              {cta.buttonLabel && cta.buttonLink ? (
                <Link
                  href={cta.buttonLink}
                  className="mt-auto inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/40"
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

