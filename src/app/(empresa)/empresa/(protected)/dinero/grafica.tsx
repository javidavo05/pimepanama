"use client";

import { useEffect, useState } from "react";
import { Area, Bar, CartesianGrid, Cell, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@/components/empresa/theme/theme-provider";
import { dinero } from "@/lib/portal/dinero";

export type PuntoMes = { mes: string; etiqueta: string; entro: number; facturado: number; gastos: number; acumulado: number; aprox: number };

/** Recharts pinta con atributos SVG que no leen var(--…): se resuelven los tokens del tema y se releen al cambiarlo. */
const TOKENS = { entro: "--c-ok", facturado: "--c-info", gastos: "--c-fg-faint", acumulado: "--c-grape", grid: "--c-line", tick: "--c-fg-faint", cursor: "--c-fg" } as const;
type Colores = Record<keyof typeof TOKENS, string>;
const FALLBACK: Colores = { entro: "rgb(19 118 56)", facturado: "rgb(37 99 235)", gastos: "rgb(108 117 132)", acumulado: "rgb(124 58 237)", grid: "rgb(226 230 236)", tick: "rgb(97 109 126)", cursor: "rgb(15 23 42 / 0.05)" };

function useColores(): Colores {
  const { resolved } = useTheme();
  const [c, setC] = useState(FALLBACK);
  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    const leer = (k: keyof typeof TOKENS) => {
      const raw = s.getPropertyValue(TOKENS[k]).trim();
      return raw ? (k === "cursor" ? `rgb(${raw} / 0.05)` : `rgb(${raw})`) : FALLBACK[k];
    };
    setC(Object.fromEntries(Object.keys(TOKENS).map((k) => [k, leer(k as keyof typeof TOKENS)])) as Colores);
  }, [resolved]);
  return c;
}

const corto = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Globo({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PuntoMes;
  const filas: [string, number, string][] = [["Entró", p.entro, "bg-ok"], ["Facturado", p.facturado, "bg-info"], ...(p.gastos ? [["Gastos", p.gastos, "bg-fg-faint"] as [string, number, string]] : []), ["Acumulado", p.acumulado, "bg-grape"]];
  return (
    <div className="min-w-56 rounded-2xl border border-line bg-pop/90 px-4 py-3 text-sm shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-fg-dim">{p.etiqueta}</p>
      <dl className="grid gap-1">
        {filas.map(([k, v, c]) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <dt className="inline-flex items-center gap-2 text-fg-dim"><span className={`h-2 w-2 rounded-full ${c}`} aria-hidden />{k}</dt>
            <dd className="tabular-nums font-semibold text-fg">{dinero(v)}</dd>
          </div>
        ))}
      </dl>
      {p.aprox > 0.005 && <p className="mt-2 max-w-60 text-xs text-warn">Incluye {dinero(p.aprox)} de cobros viejos ubicados por la fecha de su factura.</p>}
      <p className="mt-2 text-xs text-fg-faint">Toca la barra para ver el detalle del mes</p>
    </div>
  );
}

/** Barra con degradado (lleno arriba, suave abajo) y esquinas redondas: la seleccionada queda al frente. */
const degradado = (id: string, color: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={color} stopOpacity={1} />
    <stop offset="100%" stopColor={color} stopOpacity={0.45} />
  </linearGradient>
);

/** Mes a mes: barras de lo que entró y lo facturado, área del acumulado. Tocar un mes lo selecciona. */
export default function GraficaMensual({ datos, seleccion, onSelect, series }: { datos: PuntoMes[]; seleccion: string | null; onSelect: (mes: string | null) => void; series: { facturado: boolean; acumulado: boolean; gastos: boolean } }) {
  const c = useColores();
  const ancho = Math.max(datos.length * (series.facturado ? 64 : 44), 320);
  const opacidad = (mes: string) => (seleccion && seleccion !== mes ? 0.25 : 1);
  const toque = (d: { payload?: PuntoMes }) => d.payload && onSelect(d.payload.mes === seleccion ? null : d.payload.mes);
  const barras = [
    { key: "entro" as const, color: c.entro, ver: true },
    { key: "facturado" as const, color: c.facturado, ver: series.facturado },
    { key: "gastos" as const, color: c.gastos, ver: series.gastos },
  ].filter((b) => b.ver);
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div style={{ minWidth: datos.length > 12 ? ancho : undefined }} className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datos} barGap={6} barCategoryGap="28%" margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
            <defs>
              {barras.map((b) => <g key={b.key}>{degradado(`dinero-${b.key}`, b.color)}</g>)}
              <linearGradient id="dinero-acumulado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.acumulado} stopOpacity={0.22} />
                <stop offset="100%" stopColor={c.acumulado} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid yAxisId="m" stroke={c.grid} strokeOpacity={0.6} vertical={false} />
            <XAxis dataKey="etiqueta" tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={12} interval="preserveStartEnd" />
            <YAxis yAxisId="m" tickFormatter={corto} tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
            <YAxis yAxisId="a" orientation="right" hide width={0} domain={[0, "dataMax"]} />
            <Tooltip content={<Globo />} cursor={{ fill: c.cursor, radius: 12 } as object} wrapperStyle={{ outline: "none" }} />
            {series.acumulado && (
              <Area yAxisId="a" type="monotone" dataKey="acumulado" name="Acumulado" stroke={c.acumulado} strokeWidth={2.5} fill="url(#dinero-acumulado)"
                dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: c.acumulado, fill: "white" }} animationDuration={1100} />
            )}
            {barras.map((b, i) => (
              <Bar key={b.key} yAxisId="m" dataKey={b.key} radius={[8, 8, 2, 2]} maxBarSize={30} fill={`url(#dinero-${b.key})`} onClick={toque} cursor="pointer" animationDuration={800} animationBegin={i * 120}>
                {datos.map((d) => <Cell key={d.mes} fill={`url(#dinero-${b.key})`} fillOpacity={opacidad(d.mes)} className="transition-[fill-opacity] duration-200 ease-out" />)}
              </Bar>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
