"use client";

import { motion } from "framer-motion";
import { SkillBar } from "./skill-bar";
import { TimelineItem, type TimelineEntry } from "./timeline-item";
import { TechBadge } from "./tech-badge";

const skillCategories = [
  {
    category_en: "Frontend",
    category_es: "Frontend",
    skills: [
      { name: "Next.js / React", level: 98 },
      { name: "TypeScript", level: 96 },
      { name: "Tailwind CSS", level: 96 },
      { name: "Framer Motion", level: 85 },
    ],
  },
  {
    category_en: "Backend",
    category_es: "Backend",
    skills: [
      { name: "Node.js / API Routes", level: 94 },
      { name: "Supabase / PostgreSQL", level: 92 },
      { name: "Prisma / Drizzle ORM", level: 88 },
      { name: "REST APIs & Webhooks", level: 91 },
    ],
  },
  {
    category_en: "Infrastructure",
    category_es: "Infraestructura",
    skills: [
      { name: "Vercel", level: 96 },
      { name: "AWS S3 / Cloudflare R2", level: 83 },
      { name: "Turborepo / Monorepo", level: 82 },
      { name: "Supabase RLS & Auth", level: 90 },
    ],
  },
];

const techIcons = [
  "Next.js 15", "React 19", "TypeScript", "Supabase", "Tailwind CSS",
  "Vercel", "AWS S3", "Stripe", "Framer Motion", "Electron",
  "Drizzle ORM", "Prisma", "Turborepo", "PWA", "Recharts",
];

const experience: TimelineEntry[] = [
  {
    role: "Founder & Lead Developer",
    company: "PIME Panama",
    period: "2022 – Present",
    description:
      "Building enterprise SaaS platforms and web applications for clients across Panama and Latin America. Specializing in multi-tenant architectures, payment integrations, and complex business logic.",
    highlights: [
      "Delivered 8+ production SaaS platforms worth $1.1M+ combined",
      "Led teams of up to 5 developers across concurrent projects",
      "Integrated 5+ payment gateways (Stripe, Yappy, PagueloFacil, Tilopay, Banco General)",
      "Architected Turborepo monorepos, Electron desktop apps, and PWA offline systems",
    ],
    type: "work",
  },
  {
    role: "Full-Stack Engineer",
    company: "Freelance / Contract",
    period: "2020 – 2022",
    description:
      "Developed custom web applications and e-commerce solutions for local businesses, building expertise in React, Node.js, and database design.",
    highlights: [
      "Built 10+ client websites and web applications",
      "Transitioned from WordPress to full-stack React/Next.js development",
      "Established core patterns for auth, CRUD, and API design used in later projects",
    ],
    type: "freelance",
  },
];

export function InteractiveResume({ locale }: { locale: "en" | "es" }) {
  return (
    <section className="border-b border-white/10 bg-[#030611] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl space-y-16">
        {/* heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">
            {locale === "es" ? "Experiencia técnica" : "Technical expertise"}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {locale === "es" ? "Stack & Habilidades" : "Stack & Skills"}
          </h2>
        </motion.div>

        {/* skills + timeline */}
        <div className="grid gap-16 lg:grid-cols-2">
          {/* skills */}
          <div className="space-y-10">
            {skillCategories.map((cat, ci) => (
              <motion.div
                key={cat.category_en}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: ci * 0.1 }}
                className="space-y-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/35">
                  {locale === "es" ? cat.category_es : cat.category_en}
                </p>
                <div className="space-y-3">
                  {cat.skills.map((skill, si) => (
                    <SkillBar
                      key={skill.name}
                      name={skill.name}
                      level={skill.level}
                      delay={ci * 0.1 + si * 0.06}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* experience timeline */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-8 text-xs font-semibold uppercase tracking-[0.4em] text-white/35"
            >
              {locale === "es" ? "Experiencia" : "Experience"}
            </motion.p>
            <div>
              {experience.map((entry, i) => (
                <TimelineItem
                  key={i}
                  entry={entry}
                  index={i}
                  isLast={i === experience.length - 1}
                />
              ))}
            </div>
          </div>
        </div>

        {/* tech icons cloud */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="space-y-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/35">
            {locale === "es" ? "Tecnologías que usamos" : "Technologies we use"}
          </p>
          <div className="flex flex-wrap gap-2">
            {techIcons.map((tech, i) => (
              <TechBadge key={tech} tech={tech} delay={i * 0.03} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
