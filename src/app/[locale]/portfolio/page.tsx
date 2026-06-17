"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavigationBar } from "@/components/landing/navigation-bar";
import { LandingFooter } from "@/components/landing/footer";
import { PortfolioHero } from "@/components/portfolio/portfolio-hero";
import { PortfolioFilters } from "@/components/portfolio/portfolio-filters";
import { ProjectCardFull, type ProjectCardData } from "@/components/portfolio/project-card-full";
import { ProjectDetailModal } from "@/components/portfolio/project-detail-modal";
import { ValueBanner } from "@/components/portfolio/value-banner";
import { InteractiveResume } from "@/components/portfolio/interactive-resume";
import { getStaticPortfolioItems } from "@/lib/static-portfolio-data";
import { Icon } from "@iconify/react";

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function PortfolioPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = (params.locale === "es" ? "es" : "en") as "en" | "es";

  const rawItems = getStaticPortfolioItems();
  const projects: ProjectCardData[] = rawItems.map((item) => ({
    id: item.id,
    title: locale === "es" ? item.title_es : item.title_en,
    summary: locale === "es" ? item.summary_es : item.summary_en,
    outcome: locale === "es" ? item.outcome_es : item.outcome_en,
    clientName: item.clientName,
    industry: locale === "es" ? item.industry_es : item.industry_en,
    imageUrl: item.imageUrl,
    screenshots: parseJSON<string[]>(item.screenshots, []),
    techStack: parseJSON<string[]>(item.techStack, []),
    highlights: parseJSON<string[]>(item.highlights, []),
    liveUrl: item.liveUrl,
    repoUrl: item.repoUrl,
    demoUrl: item.demoUrl,
    category: item.category,
    year: item.year,
    value: item.value,
  }));

  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedProject, setExpandedProject] = useState<ProjectCardData | null>(null);

  const filterOptions = [
    { key: "all", label: locale === "es" ? "Todos" : "All" },
    { key: "saas", label: "SaaS" },
    { key: "web-app", label: "Web App" },
  ];

  const filtered = useMemo(() => {
    if (activeFilter === "all") return projects;
    return projects.filter((p) => p.category === activeFilter);
  }, [activeFilter, projects]);

  const navItems = [
    { label: locale === "es" ? "Servicios" : "Services", href: `/${locale}#services` },
    { label: locale === "es" ? "Sectores" : "Sectors", href: `/${locale}#sectors` },
    { label: locale === "es" ? "Diferenciales" : "Advantages", href: `/${locale}#differentiators` },
    { label: locale === "es" ? "Portafolio" : "Portfolio", href: `/${locale}/portfolio` },
    { label: locale === "es" ? "Contacto" : "Contact", href: `/${locale}#contact` },
  ];

  return (
    <>
      <NavigationBar locale={locale} items={navItems} />
      <main>
        <PortfolioHero locale={locale} />

        {/* projects section */}
        <section className="border-b border-white/10 bg-[#050505] px-6 py-20 text-white">
          <div className="mx-auto max-w-6xl space-y-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">
                  {locale === "es" ? "Proyectos" : "Projects"}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {locale === "es" ? `${filtered.length} proyectos` : `${filtered.length} projects`}
                </h2>
              </div>
              <PortfolioFilters
                options={filterOptions}
                active={activeFilter}
                onChange={setActiveFilter}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {filtered.map((project, i) => (
                  <ProjectCardFull
                    key={project.id}
                    project={project}
                    index={i}
                    locale={locale}
                    onExpand={setExpandedProject}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <ValueBanner locale={locale} />
        <InteractiveResume locale={locale} />

        {/* CTA */}
        <section className="relative overflow-hidden border-b border-white/10 bg-[#030611] px-6 py-24 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.1),_transparent_70%)]" />
          <div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-5"
            >
              <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">
                {locale === "es" ? "¿Tienes un proyecto?" : "Have a project?"}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {locale === "es"
                  ? "Construyamos algo juntos"
                  : "Let's build something together"}
              </h2>
              <p className="text-base text-white/55">
                {locale === "es"
                  ? "Desde MVP hasta plataformas enterprise. Hablemos de tu proyecto."
                  : "From MVP to enterprise platforms. Let's talk about your project."}
              </p>
            </motion.div>
            <motion.a
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              href={`/${locale}#contact`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1d4ed8] to-[#2563EB] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_0_40px_rgba(37,99,235,0.4)] transition hover:shadow-[0_0_50px_rgba(37,99,235,0.55)]"
            >
              {locale === "es" ? "Contactar" : "Get in touch"}
              <Icon icon="ph:arrow-right" className="h-3.5 w-3.5" />
            </motion.a>
          </div>
        </section>
      </main>
      <LandingFooter locale={locale} />
      <ProjectDetailModal
        project={expandedProject}
        locale={locale}
        onClose={() => setExpandedProject(null)}
      />
    </>
  );
}
