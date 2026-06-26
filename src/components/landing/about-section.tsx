"use client";

import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";
import { useCountUp } from "@/hooks/useCountUp";

const CONTENT = {
  es: {
    eyebrow: "Sobre Nosotros",
    heading: "Tecnología que conoce tu negocio",
    body: "Pime Panamá es una empresa de desarrollo de software fundada en 2019 en Ciudad de Panamá. Somos un equipo de 5 desarrolladores especializados en construir sistemas empresariales — plataformas SaaS, CRMs, CMS, sistemas de gestión y automatización digital.",
    body2:
      "Contamos con más de 10 años de experiencia en desarrollo de software y un enfoque empresarial respaldado por formación en E-commerce (MBA, ENEB, España). Sin intermediarios, sin promesas vacías. El código que entregamos es tuyo para siempre.",
    stats: [
      { value: 5, label: "Desarrolladores", suffix: "" },
      { value: 30, label: "Sistemas entregados", suffix: "+" },
      { value: 2019, label: "Fundada", suffix: "" },
      { value: 7, label: "Años de experiencia", suffix: "" },
    ],
  },
  en: {
    eyebrow: "About Us",
    heading: "Technology that knows your business",
    body: "Pime Panamá is a software development company founded in 2019 in Panama City. We are a team of 5 developers specialized in building enterprise systems — SaaS platforms, CRMs, CMS, management systems, and digital automation.",
    body2:
      "With 10+ years of software development experience and a business-focused approach backed by E-commerce training (MBA, ENEB, Spain). No middlemen, no empty promises. The code we deliver is yours to keep forever.",
    stats: [
      { value: 5, label: "Developers", suffix: "" },
      { value: 30, label: "Systems delivered", suffix: "+" },
      { value: 2019, label: "Founded", suffix: "" },
      { value: 7, label: "Years of experience", suffix: "" },
    ],
  },
};

function StatCard({ value, label, suffix }: { value: number; label: string; suffix: string }) {
  const { ref, count } = useCountUp(value, value > 100 ? 2500 : 1800);

  return (
    <div
      ref={ref}
      className="flex flex-col items-start p-8"
      style={{ background: "rgba(8,14,32,0.6)" }}
    >
      <p
        className="text-4xl font-bold"
        style={{
          fontFamily: "var(--font-display)",
          background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {count}{suffix}
      </p>
      <p className="mt-1 text-sm text-white/55">{label}</p>
    </div>
  );
}

export function AboutSection({ locale }: { locale: Locale }) {
  const c = CONTENT[locale];

  return (
    <section
      id="about"
      className="border-b border-white/10 px-6 py-24 text-white"
      style={{ background: "linear-gradient(180deg, #030611 0%, #04050c 100%)" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-6"
          >
            <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">{c.eyebrow}</p>
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {c.heading}
            </h2>
            <p className="text-base leading-relaxed text-white/70">{c.body}</p>
            <p className="text-base leading-relaxed text-white/70">{c.body2}</p>
          </motion.div>

          {/* Right: Stats with count-up */}
          <motion.div
            initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="grid grid-cols-2 gap-px self-start"
            style={{
              border: "1px solid rgba(37,99,235,0.15)",
              borderRadius: "0.75rem",
              overflow: "hidden",
            }}
          >
            {c.stats.map((stat) => (
              <StatCard key={stat.label} value={stat.value} label={stat.label} suffix={stat.suffix} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
