"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { TechBadge } from "./tech-badge";

export type ProjectCardData = {
  id: string;
  title: string;
  summary: string;
  outcome?: string | null;
  clientName?: string | null;
  industry?: string | null;
  imageUrl?: string | null;
  screenshots: string[];
  techStack: string[];
  highlights: string[];
  liveUrl?: string | null;
  repoUrl?: string | null;
  demoUrl?: string | null;
  category: string;
  year: number;
  value: number;
};

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
}

export function ProjectCardFull({
  project,
  index,
  locale,
  onExpand,
}: {
  project: ProjectCardData;
  index: number;
  locale: "en" | "es";
  onExpand?: (project: ProjectCardData) => void;
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const images = project.screenshots.length > 0 ? project.screenshots : [project.imageUrl].filter(Boolean) as string[];

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      onClick={() => onExpand?.(project)}
      className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.03] via-black/60 to-black/80 transition-colors hover:border-[#2563EB]/30 cursor-pointer"
    >
      {/* image area */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#1d4ed8]/15 via-[#7c3aed]/8 to-transparent">
        <AnimatePresence mode="wait">
          {images[imgIndex] ? (
            <motion.div
              key={imgIndex}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 bg-cover bg-center opacity-65 transition duration-500 group-hover:opacity-85"
              style={{ backgroundImage: `url(${images[imgIndex]})` }}
            />
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-gradient-to-br from-[#1d4ed8]/20 via-[#7c3aed]/12 to-transparent"
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        {/* image nav dots */}
        {images.length > 1 ? (
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                className={`h-1.5 rounded-full transition-all ${
                  i === imgIndex ? "w-4 bg-white" : "w-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
        ) : null}

        {/* meta overlay */}
        <div className="absolute left-5 bottom-4 space-y-0.5">
          {project.clientName ? (
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">{project.clientName}</p>
          ) : null}
          {project.industry ? (
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#60A5FA]/70">{project.industry}</p>
          ) : null}
        </div>

        {/* demo badge */}
        {project.demoUrl ? (
          <div className="absolute right-4 top-4">
            <span className="rounded-full border border-[#22c55e]/40 bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#22c55e]">
              ● Live Demo
            </span>
          </div>
        ) : null}

        {/* expand hint */}
        <div className="absolute left-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] text-white/50 backdrop-blur-sm">
            Click para más info
          </span>
        </div>

        {/* year */}
        <div className="absolute left-5 top-4 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] text-white/40">
          {project.year}
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h3 className="text-base font-semibold leading-snug text-white">{project.title}</h3>
        <p className="text-sm leading-relaxed text-white/55">{project.summary}</p>

        {/* highlights */}
        {project.highlights.length > 0 ? (
          <ul className="space-y-1.5">
            {project.highlights.slice(0, 4).map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/45">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#2563EB]/70" />
                {h}
              </li>
            ))}
            {project.highlights.length > 4 ? (
              <li className="text-[10px] text-white/30 pl-3">
                +{project.highlights.length - 4} {locale === "es" ? "más" : "more"}
              </li>
            ) : null}
          </ul>
        ) : null}

        {/* tech stack */}
        {project.techStack.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {project.techStack.map((tech, i) => (
              <TechBadge key={tech} tech={tech} delay={i * 0.04} />
            ))}
          </div>
        ) : null}

        {/* links */}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
          {project.demoUrl ? (
            <Link
              href={`/${locale}${project.demoUrl}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#22c55e] transition hover:bg-[#22c55e]/20"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              {locale === "es" ? "Ver demo" : "Live demo"}
            </Link>
          ) : null}
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-[#60A5FA] transition hover:text-white"
            >
              <Icon icon="ph:arrow-line-up-right" className="h-3.5 w-3.5" />
              {locale === "es" ? "Ver sitio" : "View live"}
            </a>
          ) : null}
          {project.repoUrl ? (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white/40 transition hover:text-white/70"
            >
              <Icon icon="ph:github-logo" className="h-3.5 w-3.5" />
              Repo
            </a>
          ) : null}
          {!project.liveUrl && !project.repoUrl && !project.demoUrl ? (
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/20">
              {locale === "es" ? "Proyecto privado" : "Private project"}
            </span>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
