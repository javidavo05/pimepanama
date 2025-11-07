"use client";

import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

type Service = {
  id: string;
  order: number;
  title: string;
  description: string;
  icon?: string | null;
};

export function ServicesSection({
  heading,
  subheading,
  services,
}: {
  heading: string;
  subheading?: string | null;
  services: Service[];
}) {
  return (
    <section id="services" className="border-b border-white/10 bg-gradient-to-b from-[#030a17] via-[#04050c] to-[#020206] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">Capabilities</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
          {subheading ? <p className="max-w-3xl text-base text-white/70">{subheading}</p> : null}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((service, index) => (
            <motion.article
              key={service.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1728]/70 via-[#070b15]/80 to-[#04060d]/95 p-8 shadow-[0_20px_30px_-25px_rgba(37,99,235,0.6)] transition duration-300 hover:border-[#2563EB]/50 hover:shadow-[0_25px_45px_-20px_rgba(37,99,235,0.7)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-10%,rgba(96,165,250,0.22),transparent_70%)] opacity-0 transition duration-300 group-hover:opacity-100" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2563EB]/30 bg-gradient-to-br from-[#0f1d35] to-[#081226] shadow-[0_10px_25px_-20px_rgba(37,99,235,0.8)]">
                    {service.icon ? (
                      <Icon icon={service.icon} className="h-6 w-6 text-[#93C5FD]" />
                    ) : (
                      <span className="text-sm font-semibold uppercase text-white/60">0{service.order}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{service.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-white/70">{service.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

