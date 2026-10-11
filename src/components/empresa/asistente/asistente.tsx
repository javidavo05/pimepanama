"use client";

/**
 * Marco de los asistentes de /empresa: pocos pasos, uno a la vez, con el progreso a la vista.
 * Hoja que sube desde abajo en el teléfono y panel centrado en pantallas anchas. Usa <dialog> nativo:
 * foco atrapado, Escape cierra y el fondo queda inerte sin código extra.
 */
import { useEffect, useRef, type ReactNode } from "react";

export function Asistente({ abierto, onCerrar, titulo, paso, pasos, children, pie }: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  /** Paso actual, desde 1. */
  paso: number;
  pasos: string[];
  children: ReactNode;
  /** Botones del pie: el principal a la derecha. */
  pie: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => { if (e.target === ref.current) onCerrar(); }}
      aria-labelledby="asistente-titulo"
      className="m-0 mt-auto sm:m-auto w-full max-w-none sm:max-w-lg max-h-[92dvh] rounded-t-2xl sm:rounded-2xl border border-line bg-panel p-0 text-fg shadow-2xl backdrop:bg-black/50 open:flex open:flex-col"
    >
      <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
        <div className="min-w-0 space-y-2">
          <p className="text-fg-dim text-xs font-semibold uppercase tracking-widest">Paso {paso} de {pasos.length} · {pasos[paso - 1]}</p>
          <h2 id="asistente-titulo" className="text-fg text-xl font-semibold tracking-tight">{titulo}</h2>
        </div>
        <button type="button" onClick={onCerrar} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg-dim hover:bg-fill hover:text-fg" aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>
      <ol className="flex gap-2 px-6" aria-hidden>
        {pasos.map((p, i) => <li key={p} className={`h-1 flex-1 rounded-full ${i < paso ? "bg-brand" : "bg-fill-3"}`} />)}
      </ol>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
      <footer className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">{pie}</footer>
    </dialog>
  );
}

export const btnAsistente = {
  principal: "inline-flex items-center justify-center gap-2 min-h-12 sm:min-h-11 px-6 rounded-xl bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hi disabled:opacity-40",
  secundario: "inline-flex items-center justify-center gap-2 min-h-12 sm:min-h-11 px-6 rounded-xl border border-line-mid text-fg-mute text-sm font-semibold hover:text-fg hover:border-line-loud",
};
