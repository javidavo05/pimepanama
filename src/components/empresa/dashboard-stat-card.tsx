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
    <div className="bg-panel border border-line rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
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
      {/* Dos botones del mismo ancho: antes eran dos enlaces de texto de
          16 px de alto, difíciles de tocar y desalineados entre tarjetas. */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={href}
          className="inline-flex items-center justify-center min-h-11 sm:min-h-10 px-3 rounded-lg border border-line text-fg-mute hover:text-fg hover:border-line-mid text-sm transition-colors"
        >
          Ver todos
        </Link>
        <Link
          href={newHref}
          className="inline-flex items-center justify-center min-h-11 sm:min-h-10 px-3 rounded-lg border border-sand/30 bg-sand/10 text-sand-fg hover:bg-sand/15 text-sm font-medium transition-colors"
        >
          + Nuevo
        </Link>
      </div>
    </div>
  );
}
