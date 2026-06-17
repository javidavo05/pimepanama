"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { TechBadge } from "./tech-badge";
import type { ProjectCardData } from "./project-card-full";

export function ProjectDetailModal({
  project,
  locale,
  onClose,
}: {
  project: ProjectCardData | null;
  locale: "en" | "es";
  onClose: () => void;
}) {
  useEffect(() => {
    if (!project) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [project, onClose]);

  return (
    <AnimatePresence>
      {project ? (
        <>
          {/* backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-x-4 bottom-0 z-50 mx-auto max-w-2xl overflow-hidden rounded-t-3xl border border-white/15 bg-[#070d1a] shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-8 sm:rounded-3xl sm:w-full"
            style={{ maxHeight: "85vh" }}
          >
            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/15" />
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 2rem)" }}>
              {/* image header */}
              <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-[#1d4ed8]/20 via-[#7c3aed]/10 to-transparent">
                {project.imageUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-50"
                    style={{ backgroundImage: `url(${project.imageUrl})` }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070d1a] via-[#070d1a]/40 to-transparent" />
                <div className="absolute bottom-4 left-5 space-y-1">
                  {project.clientName ? (
                    <p className="text-[10px] uppercase tracking-[0.4em] text-white/50">{project.clientName}</p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    {project.demoUrl ? (
                      <span className="rounded-full border border-[#22c55e]/40 bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#22c55e]">
                        ● Live Demo
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                      {project.year}
                    </span>
                  </div>
                </div>
                {/* close */}
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/60 transition hover:bg-black/80 hover:text-white"
                >
                  <Icon icon="ph:x" className="h-4 w-4" />
                </button>
              </div>

              {/* content */}
              <div className="space-y-5 p-5 pb-8">
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.4em] text-[#60A5FA]">
                    {project.category?.toUpperCase()}
                  </p>
                  <h2 className="text-xl font-bold leading-snug text-white">{project.title}</h2>
                </div>

                <p className="text-sm leading-relaxed text-white/60">{project.summary}</p>

                {project.outcome ? (
                  <p className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/45">
                    {project.outcome}
                  </p>
                ) : null}

                {/* all highlights */}
                {project.highlights.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-white/30">
                      {locale === "es" ? "Características clave" : "Key features"}
                    </p>
                    <ul className="space-y-2">
                      {project.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-white/55">
                          <Icon icon="ph:check-circle" className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2563EB]" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* all tech badges */}
                {project.techStack.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-white/30">
                      {locale === "es" ? "Stack tecnológico" : "Tech stack"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.techStack.map((tech, i) => (
                        <TechBadge key={tech} tech={tech} delay={i * 0.03} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {project.demoUrl ? (
                    <Link
                      href={`/${locale}${project.demoUrl}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-2 rounded-full border border-[#22c55e]/40 bg-[#22c55e]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#22c55e] transition hover:bg-[#22c55e]/20"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                      {locale === "es" ? "Ver demo interactivo" : "View live demo"}
                    </Link>
                  ) : null}
                  {project.liveUrl ? (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#2563EB]/40 bg-[#2563EB]/10 px-4 py-2 text-xs font-semibold text-[#60A5FA] transition hover:bg-[#2563EB]/20"
                    >
                      <Icon icon="ph:arrow-line-up-right" className="h-3.5 w-3.5" />
                      {locale === "es" ? "Ver sitio" : "View live"}
                    </a>
                  ) : null}
                  {!project.demoUrl && !project.liveUrl ? (
                    <span className="text-[10px] text-white/25 uppercase tracking-wider">
                      {locale === "es" ? "Proyecto privado — NDA" : "Private project — NDA"}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
