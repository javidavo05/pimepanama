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
    <div className="bg-panel border border-line rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-fg-faint text-xs uppercase tracking-widest font-medium">
          {label}
        </p>
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <p className="text-4xl font-semibold text-fg tracking-tight">
        {count}
      </p>
      <div className="flex gap-3">
        <Link
          href={href}
          className="text-fg-dim hover:text-fg-mute text-xs transition-colors"
        >
          Ver todos →
        </Link>
        <Link
          href={newHref}
          className="text-sand-fg hover:text-sand-lt text-xs font-medium transition-colors"
        >
          + Nuevo
        </Link>
      </div>
    </div>
  );
}
