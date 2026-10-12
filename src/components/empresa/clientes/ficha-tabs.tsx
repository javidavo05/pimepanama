"use client";

/**
 * Pestañas de la ficha del cliente. Todo el contenido llega del servidor en una sola ida a la base; aquí
 * solo se elige qué panel se ve, al instante.
 *
 * - La pestaña va en la URL (?tab=), así se puede enlazar. Cambiar de pestaña agrega una entrada al
 *   historial: el botón Atrás vuelve a la anterior.
 * - En el teléfono la fila se desliza de lado sin cortarse y cada pestaña mide 44 px; la activa se
 *   desplaza a la vista dentro de su fila (no se mueve la página).
 * - Desde fuera de las pestañas (p. ej. un botón «Resolver»), `irAPestana(key, ancla?)` cambia de pestaña
 *   igual que un toque, con su entrada en el historial, y lleva la vista al punto pedido.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

export type FichaTab = { key: string; label: string; count?: number; alert?: boolean };

const EVENTO = "ficha-tab";

/** Cambia a la pestaña `key` desde cualquier parte de la página y, si se da, lleva la vista al elemento `#ancla`. */
export function irAPestana(key: string, ancla?: string) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { key, ancla } }));
}

export function FichaTabs({ tabs, initial, panels, label = "Secciones del cliente" }: { tabs: FichaTab[]; initial: string; panels: Record<string, ReactNode>; label?: string }) {
  const valid = (k: string | null | undefined) => (k && tabs.some((t) => t.key === k) ? k : tabs[0].key);
  const [tab, setTab] = useState(() => valid(initial));
  const rowRef = useRef<HTMLDivElement>(null);
  // ¿Queda pestaña escondida a la derecha? Entonces el borde se desvanece: dice «desliza».
  const [masMas, setMasMas] = useState(false);
  const elegirRef = useRef<(k: string) => void>(() => {});

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const medir = () => setMasMas(row.scrollLeft + row.clientWidth < row.scrollWidth - 2);
    medir();
    row.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      row.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, []);

  // Atrás / Adelante: la pestaña sigue a la URL.
  useEffect(() => {
    const onPop = () => setTab(valid(new URL(window.location.href).searchParams.get("tab")));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pedidos desde fuera (irAPestana): mismo efecto que tocar la pestaña, y luego al punto pedido.
  useEffect(() => {
    const onIr = (e: Event) => {
      const { key, ancla } = (e as CustomEvent<{ key: string; ancla?: string }>).detail;
      elegirRef.current(key);
      // Después de que React muestre el panel nuevo: el ancla vive dentro de él.
      setTimeout(() => {
        const destino = (ancla && document.getElementById(ancla)) || rowRef.current;
        destino?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        if (ancla && destino instanceof HTMLElement) destino.focus({ preventScroll: true });
      }, 50);
    };
    window.addEventListener(EVENTO, onIr);
    return () => window.removeEventListener(EVENTO, onIr);
  }, []);

  // La pestaña activa siempre a la vista dentro de su fila deslizable.
  useEffect(() => {
    const row = rowRef.current;
    const el = row?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    if (!row || !el) return;
    const r = row.getBoundingClientRect();
    const e = el.getBoundingClientRect();
    // 48 px de holgura: lo que tapa el desvanecido del borde.
    if (e.right > r.right - 48) row.scrollLeft += e.right - r.right + 48;
    else if (e.left < r.left) row.scrollLeft -= r.left - e.left;
  }, [tab]);

  function elegir(next: string) {
    next = valid(next);
    if (next === tab) return;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === tabs[0].key) url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.pushState(null, "", url);
  }
  useEffect(() => {
    elegirRef.current = elegir;
  });

  return (
    <div className="space-y-6">
      <div
        ref={rowRef}
        className={`scroll-mt-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          masMas ? "[mask-image:linear-gradient(to_right,black_calc(100%-48px),transparent)]" : ""
        }`}
      >
        <div role="tablist" aria-label={label} className="flex w-max min-w-full gap-6 border-b border-line pr-12">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              data-tab={t.key}
              aria-selected={tab === t.key}
              aria-controls={`panel-${t.key}`}
              onClick={() => elegir(t.key)}
              className={`-mb-px flex shrink-0 items-center gap-2 min-h-11 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key ? "border-brand text-fg" : "border-transparent text-fg-dim hover:text-fg-mute"
              }`}
            >
              {t.label}
              {t.count != null && t.count > 0 && <span className="text-xs text-fg-faint tabular-nums">{t.count}</span>}
              {t.alert && (
                <span className="w-2 h-2 rounded-full bg-warn" aria-label="Hay algo pendiente" />
              )}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((t) => (
        // Se ocultan en vez de desmontarse: un formulario a medias se conserva al volver.
        <div key={t.key} role="tabpanel" id={`panel-${t.key}`} aria-labelledby={`tab-${t.key}`} hidden={tab !== t.key}>
          {panels[t.key]}
        </div>
      ))}
    </div>
  );
}
