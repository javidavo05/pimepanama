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
  liveUrl?: string | null;
  techStack?: string;
  value?: number;
  category?: string;
};

function parseTechStack(raw?: string): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

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
  const viewPortfolioLabel = locale === "es" ? "Ver portfolio completo" : "View full portfolio";
  const viewLiveLabel = locale === "es" ? "Ver sitio" : "View live";

  const featured = items.filter((item) => {
    // show first 6 items max on landing
    return true;
  }).slice(0, 6);

  return (
    <section id="portfolio" className="border-b border-white/10 bg-[#050505] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">Portfolio</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
            {subheading ? <p className="max-w-2xl text-base text-white/60">{subheading}</p> : null}
          </div>
          <Link
            href={`/${locale}/portfolio`}
            className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-[#2563EB]/40 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-[#60A5FA] transition hover:border-[#2563EB] hover:bg-[#2563EB]/10 hover:text-white"
          >
            {viewPortfolioLabel}
            <Icon icon="ph:arrow-right" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((item, index) => {
            const stack = parseTechStack(item.techStack);
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-black/60 to-black/80 transition-colors hover:border-[#2563EB]/30"
              >
                <div className="relative h-40 w-full overflow-hidden bg-gradient-to-tr from-[#2563EB]/10 to-transparent">
                  {item.imageUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-60 transition duration-500 group-hover:scale-105 group-hover:opacity-90"
                      style={{ backgroundImage: `url(${item.imageUrl})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1d4ed8]/20 via-[#7c3aed]/10 to-transparent" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-6 space-y-1 text-xs uppercase tracking-[0.4em] text-white/50">
                    {item.clientName ? <p>{item.clientName}</p> : null}
                    {item.industry ? <p className="text-[#60A5FA]/70">{item.industry}</p> : null}
                  </div>
                  {/* demo badge */}
                  {(item as { demoUrl?: string | null }).demoUrl ? (
                    <div className="absolute right-4 top-4">
                      <span className="rounded-full border border-[#22c55e]/40 bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#22c55e]">
                        ● Live Demo
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-4 p-6">
                  <h3 className="text-base font-semibold leading-snug text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-white/55">{item.summary}</p>

                  {stack.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {stack.slice(0, 5).map((tech) => (
                        <span
                          key={tech}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50"
                        >
                          {tech}
                        </span>
                      ))}
                      {stack.length > 5 ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/30">
                          +{stack.length - 5}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-auto flex items-center gap-4 pt-2">
                    {item.liveUrl ? (
                      <a
                        href={item.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-[#60A5FA] transition hover:text-white"
                      >
                        <Icon icon="ph:arrow-line-up-right" className="h-3.5 w-3.5" />
                        {viewLiveLabel}
                      </a>
                    ) : item.caseStudyUrl ? (
                      <Link
                        href={item.caseStudyUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white/60 transition hover:text-white"
                      >
                        <Icon icon="ph:arrow-line-up-right" className="h-3.5 w-3.5" />
                        {locale === "es" ? "Ver caso" : "Case study"}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {items.length > 6 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex justify-center pt-4"
          >
            <Link
              href={`/${locale}/portfolio`}
              className="group inline-flex items-center gap-2 rounded-full border border-[#2563EB]/40 px-8 py-3 text-xs uppercase tracking-[0.3em] text-[#60A5FA] transition hover:border-[#2563EB] hover:bg-[#2563EB]/10 hover:text-white"
            >
              {locale === "es" ? `Ver ${items.length - 6} proyectos más` : `View ${items.length - 6} more projects`}
              <Icon icon="ph:arrow-right" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
