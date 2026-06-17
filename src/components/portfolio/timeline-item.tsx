"use client";

import { motion } from "framer-motion";

export type TimelineEntry = {
  role: string;
  company: string;
  period: string;
  description: string;
  highlights: string[];
  type: "work" | "freelance" | "education";
};

const typeColors = {
  work: "border-[#2563EB] bg-[#2563EB]",
  freelance: "border-[#f59e0b] bg-[#f59e0b]",
  education: "border-[#10b981] bg-[#10b981]",
};

export function TimelineItem({
  entry,
  index,
  isLast,
}: {
  entry: TimelineEntry;
  index: number;
  isLast: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative flex gap-6"
    >
      {/* connector line */}
      {!isLast ? (
        <motion.div
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: index * 0.1 + 0.2, ease: "easeOut" }}
          style={{ originY: 0 }}
          className="absolute left-[11px] top-6 h-full w-px bg-gradient-to-b from-white/20 to-transparent"
        />
      ) : null}

      {/* dot */}
      <div className="relative z-10 mt-1 flex-shrink-0">
        <div className={`h-5 w-5 rounded-full border-2 ${typeColors[entry.type]} opacity-90`} />
      </div>

      {/* content */}
      <div className="flex-1 pb-10 space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h4 className="text-sm font-semibold text-white">{entry.role}</h4>
          <span className="text-xs text-[#60A5FA]">{entry.company}</span>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/35">{entry.period}</p>
        <p className="text-sm leading-relaxed text-white/55">{entry.description}</p>
        {entry.highlights.length > 0 ? (
          <ul className="space-y-1 pt-1">
            {entry.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/45">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#60A5FA]/60" />
                {h}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </motion.div>
  );
}
