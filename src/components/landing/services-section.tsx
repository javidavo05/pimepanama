"use client";

import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { TiltCard } from "@/components/ui/tilt-card";

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
    <section
      id="services"
      className="border-b border-white/10 px-6 py-24 text-white"
      style={{ background: "linear-gradient(180deg, #030611 0%, #04050c 60%, #030611 100%)" }}
    >
      <div className="mx-auto max-w-6xl space-y-12">
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#60A5FA]">Lo que construimos</p>
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {heading}
          </h2>
          {subheading ? <p className="max-w-3xl text-base text-white/70">{subheading}</p> : null}
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <TiltCard
                maxTilt={6}
                className="group relative h-full overflow-hidden rounded-xl p-8 transition duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(12,21,48,0.8) 0%, rgba(8,14,32,0.9) 100%)",
                  border: "1px solid rgba(37,99,235,0.15)",
                  boxShadow: "0 20px 30px -25px rgba(0,0,0,0.6)",
                }}
              >
                <div
                  className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-400 group-hover:opacity-100"
                  style={{
                    background: "radial-gradient(circle at 25% 25%, rgba(37,99,235,0.12), transparent 65%)",
                    border: "1px solid rgba(37,99,235,0.3)",
                  }}
                />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        border: "1px solid rgba(37,99,235,0.25)",
                        background: "rgba(8,14,32,0.8)",
                      }}
                    >
                      {service.icon ? (
                        <Icon icon={service.icon} className="h-6 w-6 text-[#60A5FA]" />
                      ) : (
                        <span className="text-sm font-semibold uppercase text-[#60A5FA]/60">
                          0{service.order}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-white">{service.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-white/65">{service.description}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
