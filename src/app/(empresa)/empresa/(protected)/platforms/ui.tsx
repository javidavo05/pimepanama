"use client";

/** Piezas chicas compartidas por la lista, el detalle, Cuentas y el asistente de Platforms. */
import { useState } from "react";
import { Icon, ICON } from "@/components/empresa/tasks/task-parts";

export const LOCAL_ICON = {
  copy: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  search: "M21 21l-5.2-5.2M17 10a7 7 0 11-14 0 7 7 0 0114 0z",
  alert: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  refresh: "M4 4v5h5M20 20v-5h-5M5.6 15a7 7 0 0011.9 2.4M18.4 9A7 7 0 006.5 6.6",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
};

export const inputCls =
  "w-full min-w-0 bg-panel border border-line-mid rounded-lg px-3 min-h-11 text-base text-fg placeholder:text-fg-ghost focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20 disabled:opacity-60";
export const labelCls = "block text-xs font-medium text-fg-dim mb-1";
export const sectionTitle = "text-xs font-semibold uppercase tracking-wider text-fg-faint";
export const linkBtn =
  "inline-flex items-center gap-2 min-h-11 sm:min-h-8 px-2 -mx-2 rounded-md text-sm text-brand-fg hover:underline disabled:opacity-50 disabled:no-underline";

/** "https://www.bleiydavo.com/" → "bleiydavo.com" */
export function hostOf(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function hrefOf(url: string) {
  return url.includes("://") ? url : `https://${url}`;
}

export function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
}

/** "hace 5 min", "hace 3 h", "hace 2 días", "12 sep 2026". */
export function hace(date: string | number | null | undefined): string | null {
  if (date == null) return null;
  const t = typeof date === "number" ? date : Date.parse(date);
  if (!Number.isFinite(t)) return null;
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  if (m < 1440) return `hace ${Math.round(m / 60)} h`;
  const d = Math.round(m / 1440);
  if (d < 30) return d === 1 ? "ayer" : `hace ${d} días`;
  return new Date(t).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });
}

import type { Tone } from "@/lib/platforms/estados";
export type { Tone };

export const TONE_TEXT: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
  brand: "text-brand-fg",
  mute: "text-fg-faint",
};

const TONE_DOT: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  brand: "bg-brand",
  mute: "bg-fill-3",
};

export const TONE_BADGE: Record<Tone, string> = {
  ok: "border-ok/30 bg-ok/10 text-ok",
  warn: "border-warn/30 bg-warn/10 text-warn",
  danger: "border-danger/30 bg-danger/10 text-danger",
  brand: "border-brand/30 bg-brand/10 text-brand-fg",
  mute: "border-line bg-fill text-fg-dim",
};

export function Dot({ tone }: { tone: Tone }) {
  return <span aria-hidden className={`inline-block w-2 h-2 rounded-full shrink-0 ${TONE_DOT[tone]}`} />;
}

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 min-h-6 rounded-md border text-xs font-medium whitespace-nowrap tabular-nums ${TONE_BADGE[tone]}`}>
      {children}
    </span>
  );
}

export { supabaseEstado, vercelEstado } from "@/lib/platforms/estados";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
      aria-label={`Copiar ${label}`}
      title={copied ? "Copiado" : `Copiar ${label}`}
      className="w-11 h-11 lg:w-8 lg:h-8 shrink-0 inline-flex items-center justify-center rounded-md text-fg-ghost hover:text-fg-mute hover:bg-fill-2 transition-colors"
    >
      <Icon d={copied ? ICON.check : LOCAL_ICON.copy} className={`w-4 h-4 ${copied ? "text-ok" : ""}`} />
    </button>
  );
}

/** Aviso de error con cierre, para lo que falla al guardar. */
export function ErrorBar({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div role="alert" className="flex items-start justify-between gap-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
      <span className="py-1">{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Cerrar aviso" className="w-8 h-8 -mr-2 inline-flex items-center justify-center shrink-0">
          <Icon d={ICON.close} />
        </button>
      )}
    </div>
  );
}

/** Pide JSON y devuelve `{ data }` o `{ error }` con el mensaje del servidor. Nunca lanza. */
export async function pedirJson<T>(url: string, init?: RequestInit): Promise<{ data: T; error?: undefined } | { data?: undefined; error: string }> {
  try {
    const r = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: (j as { error?: string }).error ?? "No se pudo completar. Intenta de nuevo." };
    return { data: j as T };
  } catch {
    return { error: "Sin conexión. Revisa el internet e intenta de nuevo." };
  }
}
