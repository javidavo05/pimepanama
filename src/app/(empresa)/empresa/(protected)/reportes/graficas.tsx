import type { ReactNode } from "react";

/**
 * Gráficas simples de los reportes, sin librerías: barras con CSS y los colores del tema (se leen igual en
 * claro y oscuro). Cada barra lleva su cifra escrita: el color nunca es lo único que informa.
 */

export const tarjeta = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";

export function Seccion({ titulo, leyenda, children, accion }: { titulo: string; leyenda?: ReactNode; children: ReactNode; accion?: ReactNode }) {
  return (
    <section className={tarjeta}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-fg text-base font-semibold">{titulo}</h2>
          {leyenda && <p className="mt-1 text-fg-dim text-sm leading-relaxed">{leyenda}</p>}
        </div>
        {accion}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Cifras({ items }: { items: { k: string; v: ReactNode; d?: ReactNode; tono?: "ok" | "danger" | "brand" }[] }) {
  const color = { ok: "text-ok", danger: "text-danger", brand: "text-brand-fg" } as const;
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((i) => (
        <div key={i.k} className="bg-panel border border-line rounded-2xl p-4 min-w-0">
          <dt className="text-fg-dim text-xs">{i.k}</dt>
          <dd className={`mt-1 text-xl font-semibold tabular-nums tracking-tight [overflow-wrap:anywhere] ${i.tono ? color[i.tono] : "text-fg"}`}>{i.v}</dd>
          {i.d && <dd className="mt-1 text-fg-faint text-xs">{i.d}</dd>}
        </div>
      ))}
    </dl>
  );
}

const TONO_BARRA = { brand: "bg-brand", ok: "bg-ok", danger: "bg-danger", warn: "bg-warn", neutro: "bg-fg-faint" } as const;
export type TonoBarra = keyof typeof TONO_BARRA;

/** Lista de barras horizontales: etiqueta a la izquierda, barra proporcional y cifra a la derecha. */
export function Barras({ filas, etiqueta }: { filas: { clave: string; etiqueta: ReactNode; valor: number; texto: ReactNode; detalle?: ReactNode; tono?: TonoBarra }[]; etiqueta: string }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="grid gap-3" aria-label={etiqueta}>
      {filas.map((f) => (
        <li key={f.clave} className="grid gap-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 text-fg [overflow-wrap:anywhere]">{f.etiqueta}</span>
            <span className="shrink-0 text-fg tabular-nums font-semibold">{f.texto}</span>
          </div>
          <div className="h-2 rounded-full bg-fill overflow-hidden" aria-hidden>
            <div className={`h-full rounded-full ${TONO_BARRA[f.tono ?? "brand"]}`} style={{ width: `${f.valor > 0 ? Math.max(2, (f.valor / max) * 100) : 0}%` }} />
          </div>
          {f.detalle && <p className="text-fg-dim text-xs">{f.detalle}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Columnas verticales (una por mes). Se desplaza de lado en pantallas muy angostas sin mover la página. */
export function Columnas({ cols, etiqueta }: { cols: { clave: string; etiqueta: string; valor: number; texto: string; detalle?: string }[]; etiqueta: string }) {
  const max = Math.max(1, ...cols.map((c) => c.valor));
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <ol className="grid min-w-[480px] gap-2" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }} aria-label={etiqueta}>
        {cols.map((c) => (
          <li key={c.clave} className="grid gap-2 min-w-0 text-center">
            <span className="text-fg text-xs font-semibold tabular-nums [overflow-wrap:anywhere]">{c.texto}</span>
            <div className="h-40 flex items-end rounded-lg bg-fill overflow-hidden" aria-hidden>
              <div className="w-full rounded-t-lg bg-brand" style={{ height: `${c.valor > 0 ? Math.max(3, (c.valor / max) * 100) : 0}%` }} />
            </div>
            <span className="text-fg-dim text-xs capitalize">{c.etiqueta}</span>
            {c.detalle && <span className="text-fg-faint text-xs">{c.detalle}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Barra apilada (por ejemplo detractores / pasivos / promotores) con su leyenda escrita. */
export function Apilada({ partes, etiqueta }: { partes: { clave: string; etiqueta: string; valor: number; tono: TonoBarra }[]; etiqueta: string }) {
  const total = partes.reduce((a, p) => a + p.valor, 0);
  return (
    <div className="grid gap-3">
      <div className="flex h-3 rounded-full overflow-hidden bg-fill" role="img" aria-label={`${etiqueta}: ${partes.map((p) => `${p.etiqueta} ${p.valor}`).join(", ")}`}>
        {total > 0 && partes.map((p) => p.valor > 0 && <div key={p.clave} className={TONO_BARRA[p.tono]} style={{ width: `${(p.valor / total) * 100}%` }} />)}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-fg-dim">
        {partes.map((p) => (
          <li key={p.clave} className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${TONO_BARRA[p.tono]}`} aria-hidden />
            {p.etiqueta} <b className="text-fg tabular-nums">{p.valor}</b>
            {total > 0 && <span className="tabular-nums">({Math.round((p.valor / total) * 100)} %)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-mid px-4 py-8 text-center">
      <p className="text-fg font-medium">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-fg-dim text-sm leading-relaxed">{texto}</p>
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  );
}
