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
  const portfolioNote =
    locale === "es"
      ? "Lo siguiente es una selección de sistemas activos. Representan una pequeña parte de más de 30 productos digitales entregados."
      : "The following is a selection of active systems. They represent a small part of 30+ digital products delivered.";

  const featured = items.slice(0, 8);

  return (
    <section
      id="projects"
      className="border-b border-white/10 px-6 py-24 text-white"
      style={{ background: "linear-gradient(180deg, #04050c 0%, #030611 100%)" }}
    >
      <div className="mx-auto max-w-6xl space-y-12">
        <motion.div
          className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">Portafolio</p>
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {heading}
            </h2>
            {subheading ? (
              <p className="max-w-2xl text-base text-white/60">{subheading}</p>
            ) : null}
            <p className="max-w-2xl text-sm italic text-white/45">{portfolioNote}</p>
          </div>
          <Link
            href="/portfolio"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-[#60A5FA] transition"
            style={{ border: "1px solid rgba(37,99,235,0.3)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(37,99,235,0.6)";
              (e.currentTarget as HTMLElement).style.color = "#93C5FD";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(37,99,235,0.3)";
              (e.currentTarget as HTMLElement).style.color = "#60A5FA";
            }}
          >
            {viewPortfolioLabel}
            <Icon icon="ph:arrow-right" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((item, index) => {
            const stack = parseTechStack(item.techStack);
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 32, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="group flex flex-col overflow-hidden rounded-xl transition-all duration-300"
                style={{
                  border: "1px solid rgba(37,99,235,0.12)",
                  background: "linear-gradient(135deg, rgba(8,14,32,0.7) 0%, rgba(3,6,17,0.9) 100%)",
                }}
                whileHover={{
                  borderColor: "rgba(37,99,235,0.35)",
                  boxShadow: "0 20px 50px -25px rgba(37,99,235,0.25)",
                }}
              >
                <div
                  className="relative h-40 w-full overflow-hidden"
                  style={{ background: "rgba(8,14,32,0.6)" }}
                >
                  {item.imageUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-60 transition duration-500 group-hover:scale-105 group-hover:opacity-85"
                      style={{ backgroundImage: `url(${item.imageUrl})` }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(8,14,32,0.6) 100%)",
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-5 space-y-0.5 text-xs uppercase tracking-[0.35em]">
                    {item.clientName ? (
                      <p className="text-white/60">{item.clientName}</p>
                    ) : null}
                    {item.industry ? (
                      <p className="text-[#60A5FA]/65">{item.industry}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-6">
                  <h3 className="text-base font-semibold leading-snug text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-white/55">{item.summary}</p>

                  {stack.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {stack.slice(0, 5).map((tech) => (
                        <span
                          key={tech}
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50"
                          style={{ border: "1px solid rgba(37,99,235,0.15)", background: "rgba(37,99,235,0.07)" }}
                        >
                          {tech}
                        </span>
                      ))}
                      {stack.length > 5 ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white/30"
                          style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
                        >
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

        {items.length > 8 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex justify-center pt-4"
          >
            <Link
              href="/portfolio"
              className="group inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase tracking-[0.3em] text-[#60A5FA] transition"
              style={{ border: "1px solid rgba(37,99,235,0.3)" }}
            >
              {locale === "es"
                ? `Ver ${items.length - 8} proyectos más`
                : `View ${items.length - 8} more projects`}
              <Icon icon="ph:arrow-right" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
