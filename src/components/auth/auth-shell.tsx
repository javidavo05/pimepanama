import type { ReactNode } from "react";

/**
 * Marco de las pantallas de acceso (equipo y clientes): logo, título, una tarjeta con el formulario
 * y una línea de pie. Mismo ancho y ritmo en todas, para que entrar se sienta igual en todos lados.
 */
export function AuthShell({ eyebrow, title, subtitle, children, footer }: { eyebrow?: string; title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="min-h-dvh bg-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- ícono SVG estático de la marca */}
          <img src="/pime-icon.svg" alt="Pime" width={48} height={48} className="h-12 w-12" />
          {eyebrow && <p className="text-brand-fg text-xs font-semibold uppercase tracking-[0.14em]">{eyebrow}</p>}
          <h1 className="text-fg text-2xl font-bold tracking-tight text-balance">{title}</h1>
          {subtitle && <p className="text-fg-dim text-sm leading-relaxed max-w-sm">{subtitle}</p>}
        </div>
        <div className="bg-panel border border-line rounded-2xl p-6 sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-fg-faint text-xs leading-relaxed">{footer}</div>}
      </div>
    </main>
  );
}

export const campo =
  "a-campo w-full min-h-12 rounded-lg border border-line-mid bg-fill px-4 text-base text-fg placeholder:text-fg-trace focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
export const etiqueta = "a-etiqueta block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-2";
export const botonPrincipal =
  "a-btn a-btn-1 w-full inline-flex items-center justify-center min-h-12 rounded-lg bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";
export const botonSecundario =
  "a-btn w-full inline-flex items-center justify-center min-h-12 rounded-lg border border-line-mid hover:border-line-loud text-fg-mute hover:text-fg text-sm font-semibold transition-colors disabled:opacity-50";
export const errorBox = "a-alerta rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-soft";
export const okBox = "a-listo rounded-lg border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok-soft";
