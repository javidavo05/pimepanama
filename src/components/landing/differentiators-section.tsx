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
    <section
      id="differentiators"
      className="border-b border-white/10 px-6 py-24 text-white"
      style={{ background: "linear-gradient(180deg, #04050c 0%, #030611 100%)" }}
    >
      <div className="mx-auto max-w-6xl space-y-12">
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">Why PIME</p>
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {heading}
          </h2>
          {subheading ? <p className="max-w-3xl text-base text-white/70">{subheading}</p> : null}
        </motion.div>

        <div className="space-y-0">
          {items.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="group flex gap-8 border-b py-10 last:border-b-0"
              style={{ borderColor: "rgba(37,99,235,0.12)" }}
            >
              <span
                className="shrink-0 text-5xl font-bold leading-none tabular-nums opacity-20 transition duration-300 group-hover:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: "var(--font-display)",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="space-y-2 pt-1">
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{item.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
