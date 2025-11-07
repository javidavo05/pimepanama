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
    <section id="services" className="border-b border-white/10 bg-[#050505] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Capabilities</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
          {subheading ? <p className="max-w-3xl text-base text-white/60">{subheading}</p> : null}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((service, index) => (
            <motion.article
              key={service.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 backdrop-blur"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_70%)] opacity-0 transition group-hover:opacity-100" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    {service.icon ? (
                      <Icon icon={service.icon} className="h-6 w-6 text-white/70" />
                    ) : (
                      <span className="text-sm font-semibold uppercase text-white/50">0{service.order}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{service.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-white/60">{service.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

