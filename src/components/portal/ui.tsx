/**
 * Piezas visuales del portal. Usan los tokens del tema (.portal-app), así sirven en la línea Normal
 * y en la Premium sin cambios. Escala de espacio 4/8/12/16/24/32/48; una sola familia (Manrope).
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { IconFlecha } from "./iconos";

export function Tarjeta({ children, className = "", as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <As className={`bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0 ${className}`}>{children}</As>;
}

export function Encabezado({ eyebrow, titulo, detalle, accion }: { eyebrow?: string; titulo: string; detalle?: ReactNode; accion?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-brand-fg text-xs font-semibold uppercase tracking-[0.14em]">{eyebrow}</p>}
        <h1 className="text-fg text-2xl sm:text-3xl font-bold tracking-tight text-balance break-words">{titulo}</h1>
        {detalle && <p className="text-fg-dim text-sm sm:text-base leading-relaxed max-w-2xl">{detalle}</p>}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </header>
  );
}

export function TituloSeccion({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 className="text-fg text-base sm:text-lg font-bold tracking-tight">{children}</h2>
      {accion && <div className="shrink-0 [&>a]:inline-flex [&>a]:items-center [&>a]:min-h-11">{accion}</div>}
    </div>
  );
}

const TONOS = {
  neutro: "bg-fill-2 text-fg-dim",
  marca: "bg-brand/10 text-brand-fg",
  ok: "bg-ok/10 text-ok",
  aviso: "bg-warn/10 text-warn",
  peligro: "bg-danger/10 text-danger",
} as const;
export type Tono = keyof typeof TONOS;

export function Etiqueta({ children, tono = "neutro" }: { children: ReactNode; tono?: Tono }) {
  return <span className={`inline-flex items-center self-start justify-self-start rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${TONOS[tono]}`}>{children}</span>;
}

export function Barra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className="space-y-2">
      <div className="h-2 rounded-full bg-fill-3 overflow-hidden" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={etiqueta}>
        <div className="h-full rounded-full bg-brand origin-left transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${v / 100})` }} />
      </div>
    </div>
  );
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-mid px-6 py-12 text-center">
      <p className="text-fg font-semibold">{titulo}</p>
      <p className="mt-2 text-fg-dim text-sm leading-relaxed max-w-md mx-auto">{texto}</p>
      {accion && <div className="mt-6 flex justify-center">{accion}</div>}
    </div>
  );
}

/** Fila tocable que lleva a un detalle. */
export function Fila({ href, titulo, detalle, derecha }: { href: string; titulo: ReactNode; detalle?: ReactNode; derecha?: ReactNode }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 rounded-xl px-4 py-4 -mx-4 hover:bg-fill min-h-14">
        <div className="min-w-0 flex-1">
          <p className="text-fg font-semibold truncate">{titulo}</p>
          {detalle && <p className="text-fg-dim text-sm truncate">{detalle}</p>}
        </div>
        {derecha}
        <IconFlecha className="shrink-0 text-fg-ghost group-hover:text-fg" />
      </Link>
    </li>
  );
}

export const btnPrincipal = "inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";
export const btnSecundario = "inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl border border-line-mid hover:border-line-loud bg-panel text-fg text-sm font-semibold transition-colors disabled:opacity-50";
export const btnPeligro = "inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl border border-danger/30 text-danger text-sm font-semibold hover:bg-danger/10 transition-colors disabled:opacity-50";

export function fechaCorta(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Panama" });
}
export function haceCuanto(d: Date | string): string {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60); if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  const dd = Math.round(h / 24); if (dd < 30) return `hace ${dd} ${dd === 1 ? "día" : "días"}`;
  return fechaCorta(d);
}
