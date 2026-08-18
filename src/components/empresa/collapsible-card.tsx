import type { ReactNode } from "react";

interface CollapsibleCardProps {
  title: string;
  /** Texto corto a la derecha del título (conteo, monto, aviso). */
  meta?: string;
  /** Abierta de entrada. Por defecto cerrada: lo secundario no debe empujar lo importante. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Sección plegable con <details> nativo: sin estado ni JS, usable desde
 * componentes de servidor.
 */
export function CollapsibleCard({ title, meta, defaultOpen = false, children }: CollapsibleCardProps) {
  return (
    <details
      open={defaultOpen}
      className="group bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden"
    >
      <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer list-none select-none hover:bg-white/[0.02] transition-colors [&::-webkit-details-marker]:hidden">
        <span className="text-white/45 text-[10px] transition-transform group-open:rotate-90">▶</span>
        <span className="text-white/60 text-xs uppercase tracking-widest font-medium">{title}</span>
        {meta && <span className="text-white/40 text-xs ml-auto">{meta}</span>}
      </summary>
      <div className="px-5 pb-5 pt-1 border-t border-white/[0.05]">{children}</div>
    </details>
  );
}
