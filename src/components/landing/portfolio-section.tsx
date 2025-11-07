"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

type PortfolioItem = {
  id: string;
  title: string;
  summary: string;
  outcome?: string | null;
  clientName?: string | null;
  industry?: string | null;
  imageUrl?: string | null;
  caseStudyUrl?: string | null;
};

export function PortfolioSection({
  heading,
  subheading,
  items,
  locale,
}: {
  heading: string;
  subheading?: string | null;
  items: PortfolioItem[];
  locale: "en" | "es";
}) {
  const viewCaseStudyLabel = locale === "es" ? "Ver caso de éxito" : "View case study";

  return (
    <section id="portfolio" className="border-b border-white/10 bg-[#050505] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Portfolio</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
          {subheading ? <p className="max-w-3xl text-base text-white/60">{subheading}</p> : null}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-black/60 to-black/80"
            >
              <div className="relative h-40 w-full overflow-hidden bg-gradient-to-tr from-white/10 to-transparent">
                {item.imageUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-4 left-6 space-y-1 text-xs uppercase tracking-[0.4em] text-white/50">
                  {item.clientName ? <p>{item.clientName}</p> : null}
                  {item.industry ? <p>{item.industry}</p> : null}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{item.summary}</p>
                {item.outcome ? <p className="text-sm leading-relaxed text-white/50">{item.outcome}</p> : null}
                <div className="mt-auto pt-4">
                  {item.caseStudyUrl ? (
                    <Link
                      href={item.caseStudyUrl}
                      className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:text-white"
                    >
                      <Icon icon="ph:arrow-line-up-right" className="h-4 w-4" />
                      {viewCaseStudyLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

