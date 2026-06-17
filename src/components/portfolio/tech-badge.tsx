"use client";

import { motion } from "framer-motion";

const techColors: Record<string, string> = {
  "Next.js": "bg-white/10 text-white/70 border-white/15",
  "Next.js 14": "bg-white/10 text-white/70 border-white/15",
  "Next.js 15": "bg-white/10 text-white/70 border-white/15",
  "Next.js 16": "bg-white/10 text-white/70 border-white/15",
  "React 19": "bg-[#0ea5e9]/10 text-[#38bdf8] border-[#0ea5e9]/20",
  "TypeScript": "bg-[#2563EB]/10 text-[#60A5FA] border-[#2563EB]/20",
  "Supabase": "bg-[#10b981]/10 text-[#34d399] border-[#10b981]/20",
  "PostgreSQL": "bg-[#336791]/20 text-[#7dd3fc] border-[#336791]/30",
  "Drizzle ORM": "bg-[#c4b5fd]/10 text-[#c4b5fd] border-[#c4b5fd]/20",
  "Prisma": "bg-[#2d3748]/30 text-white/60 border-white/10",
  "Tailwind CSS": "bg-[#0ea5e9]/10 text-[#38bdf8] border-[#0ea5e9]/20",
  "Tailwind v4": "bg-[#0ea5e9]/10 text-[#38bdf8] border-[#0ea5e9]/20",
  "Framer Motion": "bg-[#ec4899]/10 text-[#f472b6] border-[#ec4899]/20",
  "Electron": "bg-[#47848f]/15 text-[#9ecaed] border-[#47848f]/25",
  "Stripe": "bg-[#6772e5]/15 text-[#a5b4fc] border-[#6772e5]/25",
  "AWS S3": "bg-[#f59e0b]/10 text-[#fbbf24] border-[#f59e0b]/20",
  "Cloudflare R2": "bg-[#f97316]/10 text-[#fb923c] border-[#f97316]/20",
  "Vercel": "bg-white/8 text-white/60 border-white/10",
  "PWA": "bg-[#8b5cf6]/10 text-[#a78bfa] border-[#8b5cf6]/20",
  "Turborepo": "bg-[#ef4444]/10 text-[#f87171] border-[#ef4444]/20",
  "NFC": "bg-[#10b981]/15 text-[#6ee7b7] border-[#10b981]/20",
  "GPS": "bg-[#3b82f6]/10 text-[#93c5fd] border-[#3b82f6]/20",
  "Yappy": "bg-[#22c55e]/10 text-[#86efac] border-[#22c55e]/20",
  "Recharts": "bg-[#f43f5e]/10 text-[#fb7185] border-[#f43f5e]/20",
  "Resend": "bg-[#6366f1]/10 text-[#a5b4fc] border-[#6366f1]/20",
  "Brevo": "bg-[#14b8a6]/10 text-[#5eead4] border-[#14b8a6]/20",
  "Vitest": "bg-[#fbbf24]/10 text-[#fcd34d] border-[#fbbf24]/20",
  "Playwright": "bg-[#2dd4bf]/10 text-[#5eead4] border-[#2dd4bf]/20",
  "ExcelJS": "bg-[#16a34a]/10 text-[#86efac] border-[#16a34a]/20",
  "dnd-kit": "bg-white/8 text-white/50 border-white/10",
  "next-intl": "bg-[#818cf8]/10 text-[#a5b4fc] border-[#818cf8]/20",
  "Serwist": "bg-[#6366f1]/10 text-[#a5b4fc] border-[#6366f1]/20",
  "IndexedDB": "bg-white/8 text-white/50 border-white/10",
  "Sharp": "bg-[#84cc16]/10 text-[#bef264] border-[#84cc16]/20",
  "WhatsApp": "bg-[#22c55e]/10 text-[#86efac] border-[#22c55e]/20",
  "Redis": "bg-[#ef4444]/10 text-[#f87171] border-[#ef4444]/20",
  "pnpm": "bg-[#f59e0b]/10 text-[#fbbf24] border-[#f59e0b]/20",
  "Nodemailer": "bg-white/8 text-white/50 border-white/10",
  "xlsx": "bg-[#16a34a]/10 text-[#86efac] border-[#16a34a]/20",
  "Dodo Payments": "bg-[#f59e0b]/10 text-[#fbbf24] border-[#f59e0b]/20",
  "PagueloFacil": "bg-[#22c55e]/10 text-[#86efac] border-[#22c55e]/20",
  "Tilopay": "bg-[#3b82f6]/10 text-[#93c5fd] border-[#3b82f6]/20",
  "Banco General": "bg-[#ef4444]/10 text-[#f87171] border-[#ef4444]/20",
};

function getColor(tech: string): string {
  return techColors[tech] ?? "bg-white/8 text-white/50 border-white/10";
}

export function TechBadge({ tech, delay = 0 }: { tech: string; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide ${getColor(tech)}`}
    >
      {tech}
    </motion.span>
  );
}
