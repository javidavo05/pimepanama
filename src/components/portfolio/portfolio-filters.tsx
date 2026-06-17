"use client";

import { motion } from "framer-motion";

export type FilterOption = {
  key: string;
  label: string;
};

export function PortfolioFilters({
  options,
  active,
  onChange,
}: {
  options: FilterOption[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className="relative rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.3em] transition-colors"
        >
          {active === opt.key ? (
            <motion.span
              layoutId="active-filter"
              className="absolute inset-0 rounded-full border border-[#2563EB]/50 bg-[#2563EB]/15"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          ) : null}
          <span
            className={`relative z-10 transition-colors ${
              active === opt.key ? "text-[#60A5FA]" : "text-white/40 hover:text-white/70"
            }`}
          >
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}
