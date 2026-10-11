import type { ReactNode } from "react";

/**
 * Pinta el contenido de un cliente con su línea de marca. Premium = negro y oro en toda la zona
 * (fondo, tarjetas, botones y acentos), con un sello arriba para que se note de un vistazo.
 */
export function ZonaLinea({ linea, children }: { linea?: string | null; children: ReactNode }) {
  if (linea !== "premium") return <>{children}</>;
  return (
    <div className="linea-premium -mx-4 sm:-mx-6 md:-mx-8 -mt-4 sm:-mt-6 md:-mt-8 px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-12 min-h-dvh">
      <div className="max-w-6xl mx-auto mb-4 flex items-center gap-3">
        {/* Logo invertido en tema oscuro y a color en tema claro (globals.css: .logo-tema-*). */}
        {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de la línea Premium */}
        <img src="/brand/pime-premium-horizontal-invertido.svg" alt="" width={70} height={20} className="logo-tema-oscuro h-5 w-auto" />
        {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de la línea Premium */}
        <img src="/brand/pime-premium-horizontal-color.svg" alt="" width={70} height={20} className="logo-tema-claro h-5 w-auto" />
        <span className="rounded-full border border-sand/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sand-fg">Cliente Premium</span>
      </div>
      {children}
    </div>
  );
}
