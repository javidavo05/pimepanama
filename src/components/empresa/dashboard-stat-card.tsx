import Link from "next/link";

interface DashboardStatCardProps {
  label: string;
  count: number;
  href: string;
  newHref: string;
  color: string;
}

export function DashboardStatCard({
  label,
  count,
  href,
  newHref,
  color,
}: DashboardStatCardProps) {
  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
          {label}
        </p>
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <p className="text-4xl font-semibold text-white tracking-tight">
        {count}
      </p>
      <div className="flex gap-3">
        <Link
          href={href}
          className="text-white/40 hover:text-white/70 text-xs transition-colors"
        >
          Ver todos →
        </Link>
        <Link
          href={newHref}
          className="text-[#C8A96E] hover:text-[#d4b87a] text-xs font-medium transition-colors"
        >
          + Nuevo
        </Link>
      </div>
    </div>
  );
}
