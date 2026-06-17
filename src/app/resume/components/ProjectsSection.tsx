"use client";

import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useLang } from "../context/ResumeContext";
import { content } from "../data/content";
import { projects, demoUrl } from "../data/projects";
import { ProjectPreview } from "./ProjectPreview";

const ease = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease } },
};

export function ProjectsSection() {
  const { lang } = useLang();
  const t = content[lang].projects;

  return (
    <section
      id="projects"
      data-bg="dark"
      className="relative px-6 py-28 sm:px-10"
      style={{ backgroundColor: "#0D1F18", color: "#EEEEE8" }}
    >
      <div className="mx-auto max-w-6xl">
        <motion.p
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.6em]"
          style={{ color: "#C8A96E" }}
          data-accent="gold"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
        >
          {t.sectionLabel}
        </motion.p>
        <motion.h2
          className="mb-3 text-2xl font-bold sm:text-4xl"
          style={{ fontFamily: "var(--font-syne)", color: "#EEEEE8" }}
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease, delay: 0.05 }}
        >
          {t.heading}
        </motion.h2>
        <motion.p
          className="mb-16 max-w-2xl text-sm italic leading-relaxed"
          style={{ color: "#6B7B72" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
        >
          {t.disclaimer}
        </motion.p>

        <motion.div
          data-grid="projects"
          className="grid grid-cols-1 gap-7 lg:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.05 }}
        >
          {projects.map((project) => {
            const href = demoUrl(project, lang);
            return (
              <motion.article
                key={project.id}
                data-card
                variants={cardVariants}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="group relative flex flex-col overflow-hidden rounded-3xl border p-4 sm:p-5"
                style={{ borderColor: "rgba(238,238,232,0.1)", backgroundColor: "rgba(238,238,232,0.02)" }}
              >
                {/* Gold glow on hover */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ boxShadow: "inset 0 0 0 1px rgba(200,169,110,0.35), 0 20px 60px -20px rgba(200,169,110,0.25)" }}
                />

                {/* Preview */}
                <div className="relative mb-5">
                  <ProjectPreview project={project} />
                  {href ? (
                    <span
                      className="no-print absolute right-3 top-[calc(2.25rem+0.5rem)] rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.3em]"
                      style={{ backgroundColor: "rgba(200,169,110,0.92)", color: "#0D1F18" }}
                    >
                      {t.previewBadge}
                    </span>
                  ) : null}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col px-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.3em]"
                      style={{ color: "#C8A96E", backgroundColor: "rgba(200,169,110,0.1)" }}
                    >
                      {project.category[lang]}
                    </span>
                    <span className="ml-auto text-right">
                      <span className="text-sm font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "#C8A96E" }}>
                        {project.metric.value[lang]}
                      </span>
                      <span className="ml-1.5 text-[9px] uppercase tracking-[0.2em]" style={{ color: "#6B7B72" }}>
                        {project.metric.label[lang]}
                      </span>
                    </span>
                  </div>

                  <h3 className="mb-2 text-base font-bold leading-snug" style={{ fontFamily: "var(--font-syne)", color: "#EEEEE8" }}>
                    {project.title[lang]}
                  </h3>
                  <p className="mb-4 text-xs leading-relaxed" style={{ color: "#6B7B72" }}>
                    {project.description[lang]}
                  </p>

                  <div className="mb-5 flex flex-wrap gap-1.5">
                    {project.features[lang].slice(0, 6).map((f) => (
                      <span
                        key={f}
                        className="rounded-full border px-2 py-0.5 text-[9px] font-medium"
                        style={{ borderColor: "rgba(238,238,232,0.12)", backgroundColor: "rgba(238,238,232,0.04)", color: "#EEEEE8" }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* CTAs */}
                  <div className="mt-auto flex items-center gap-3">
                    {href ? (
                      <motion.a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        className="no-print-link inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em]"
                        style={{ backgroundColor: "#C8A96E", color: "#0D1F18" }}
                      >
                        <Icon icon="ph:play-circle-fill" className="h-3.5 w-3.5" />
                        {t.liveDemo}
                      </motion.a>
                    ) : null}
                    {project.systemUrl ? (
                      <a
                        href={project.systemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-print-link inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] transition-opacity hover:opacity-70"
                        style={{ color: "#C8A96E" }}
                      >
                        {t.viewSystem} <Icon icon="ph:arrow-up-right" className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
