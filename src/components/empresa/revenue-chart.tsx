"use client";

import { useMemo, useState } from "react";
import Link from "@/components/empresa/link";
import { dinero } from "@/lib/portal/dinero";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import type { RevenueDataPoint, YearlyRevenuePoint } from "@/lib/revenue-helpers";
import { useChartColors } from "./theme/use-chart-colors";
import { seg } from "@/components/empresa/page-header";

// Re-export so existing imports from this file keep working
export type { RevenueDataPoint, YearlyRevenuePoint };
export { buildMonthlyRevenue, buildYearlyRevenue } from "@/lib/revenue-helpers";

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-pop border border-line rounded-xl px-4 py-3 shadow-2xl text-sm">
      <p className="text-fg-dim font-semibold mb-2">{label}</p>
      <p className="text-brand-fg font-mono">Bruto: ${payload[0]?.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
      <p className="text-ok font-mono">Neto: ${payload[1]?.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
      <p className="text-fg-dim text-xs mt-1">{payload[0]?.payload?.count} cotizaciones aceptadas</p>
    </div>
  );
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  title?: string;
}

export function RevenueChart({ data, title }: RevenueChartProps) {
  const c = useChartColors();
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-fg-faint text-sm">
        Sin datos de cotizaciones aceptadas aún
      </div>
    );
  }
  return (
    <div>
      {title && <p className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis dataKey="month" tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fill: c.tickMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: c.cursor }} />
          <Legend wrapperStyle={{ fontSize: "11px", color: c.legend, paddingTop: "12px" }} formatter={(v) => v === "bruto" ? "Bruto" : "Neto recibido"} />
          <Bar dataKey="bruto" fill={c.primary} radius={[3, 3, 0, 0]} maxBarSize={32}>
            {data.map((_, i) => <Cell key={i} fill={c.primary} fillOpacity={0.85} />)}
          </Bar>
          <Bar dataKey="neto" fill={c.secondary} radius={[3, 3, 0, 0]} maxBarSize={32}>
            {data.map((_, i) => <Cell key={i} fill={c.secondary} fillOpacity={0.75} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type PuntoIngreso = { label: string; titulo: string; bruto: number; neto: number; count: number };

const corto = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`);

/** «jun 26» → «junio 2026»; un año queda tal cual. */
function tituloDe(label: string): string {
  const [mes, anio] = label.replace(".", "").split(" ");
  if (!anio) return label;
  const i = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"].indexOf(mes.toLowerCase());
  const nombre = i >= 0 ? new Date(2000, i, 1).toLocaleDateString("es-PA", { month: "long" }) : mes;
  return `${nombre} 20${anio}`;
}

// Globo del mismo estilo que la gráfica de Dinero: punto de color, etiqueta y monto alineado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Globo({ active, payload, verBruto }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PuntoIngreso;
  const filas: [string, number, string][] = [["Neto recibido", p.neto, "bg-ok"], ...(verBruto ? [["Bruto", p.bruto, "bg-info"] as [string, number, string]] : [])];
  return (
    <div className="min-w-56 rounded-2xl border border-line bg-pop/90 px-4 py-3 text-sm shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-fg-dim">{p.titulo}</p>
      <dl className="grid gap-1">
        {filas.map(([k, v, c]) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <dt className="inline-flex items-center gap-2 text-fg-dim"><span className={`h-2 w-2 rounded-full ${c}`} aria-hidden />{k}</dt>
            <dd className="tabular-nums font-semibold text-fg">{dinero(v)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-fg-faint">{p.count === 1 ? "1 factura pagada" : `${p.count} facturas pagadas`}</p>
    </div>
  );
}

/** Barra con degradado (lleno arriba, suave abajo), como en Dinero. */
const degradado = (id: string, color: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={color} stopOpacity={1} />
    <stop offset="100%" stopColor={color} stopOpacity={0.45} />
  </linearGradient>
);

interface DashboardRevenueChartProps {
  monthlyData: RevenueDataPoint[];
  yearlyData: YearlyRevenuePoint[];
}

/**
 * Ingresos del inicio, en el mismo lenguaje que la pestaña Dinero: título con el dato que importa, leyenda con
 * el total de cada serie (el bruto se prende y apaga), barras con degradado y el globo con montos alineados.
 */
export function DashboardRevenueChart({ monthlyData, yearlyData }: DashboardRevenueChartProps) {
  const [view, setView] = useState<"month" | "year">("month");
  const [verBruto, setVerBruto] = useState(true);
  const c = useChartColors();

  const datos: PuntoIngreso[] = useMemo(
    () =>
      view === "month"
        ? monthlyData.slice(-12).map((d) => ({ label: d.month, titulo: tituloDe(d.month), bruto: d.bruto, neto: d.neto, count: d.count }))
        : yearlyData.map((d) => ({ label: d.year, titulo: d.year, bruto: d.bruto, neto: d.neto, count: d.count })),
    [view, monthlyData, yearlyData],
  );

  if (monthlyData.length === 0 && yearlyData.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-fg">Ingresos</h2>
        <p className="text-sm leading-relaxed text-fg-dim">Aquí verás lo que entra mes a mes cuando registres el primer pago de una factura.</p>
        <Link href="/empresa/dinero" className="inline-flex items-center min-h-11 text-sm font-semibold text-brand-fg hover:underline">Ir a Dinero →</Link>
      </div>
    );
  }

  const mejor = datos.reduce<PuntoIngreso | null>((m, d) => (!m || d.neto > m.neto ? d : m), null);
  const totalNeto = datos.reduce((t, d) => t + d.neto, 0);
  const totalBruto = datos.reduce((t, d) => t + d.bruto, 0);
  const barras = [
    { key: "neto" as const, color: c.secondary, ver: true },
    { key: "bruto" as const, color: c.info, ver: verBruto },
  ].filter((b) => b.ver);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-fg">Ingresos</h2>
          <p className="mt-1 text-sm leading-relaxed text-fg-dim">
            {mejor && mejor.neto > 0 ? <>Mejor {view === "month" ? "mes" : "año"}: <b className="font-semibold text-fg">{mejor.titulo}</b> con <b className="font-semibold tabular-nums text-ok">{dinero(mejor.neto)}</b> recibidos. </> : null}
            <Link href="/empresa/dinero" className="whitespace-nowrap font-semibold text-brand-fg hover:underline">Ver el detalle en Dinero →</Link>
          </p>
        </div>
        <div className={`${seg.group} shrink-0 whitespace-nowrap`} aria-label="Agrupar ingresos">
          {(["month", "year"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={seg.item(view === v)}>
              {v === "month" ? "Por mes" : "Por año"}
            </button>
          ))}
        </div>
      </div>
      {/* Leyenda con el total de cada serie, como en Dinero; el bruto se prende y apaga. */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-md">
        {([
          { id: "neto", label: "Neto recibido", valor: totalNeto, punto: "bg-ok", activo: true },
          { id: "bruto", label: "Bruto", valor: totalBruto, punto: "bg-info", activo: verBruto },
        ] as const).map((x) => (
          <button key={x.id} type="button" disabled={x.id === "neto"} aria-pressed={x.activo}
            onClick={() => x.id === "bruto" && setVerBruto((v) => !v)}
            className={`min-h-11 min-w-0 rounded-xl border px-2 py-2 text-left sm:px-3 transition-[opacity,transform,border-color,box-shadow] duration-200 ease-out active:scale-[0.97] disabled:active:scale-100 disabled:cursor-default ${x.activo ? "border-line bg-panel shadow-sm" : "border-dashed border-line-mid opacity-50 hover:opacity-80"}`}>
            <span className="flex items-center gap-2 text-xs font-medium text-fg-dim"><span className={`h-2 w-2 rounded-full ${x.punto}`} aria-hidden />{x.label}</span>
            <span className="mt-1 block truncate text-xs font-semibold tabular-nums text-fg sm:text-sm">{dinero(x.valor)}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} barGap={6} barCategoryGap="28%" margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
            <defs>{barras.map((b) => <g key={b.key}>{degradado(`inicio-${b.key}`, b.color)}</g>)}</defs>
            <CartesianGrid stroke={c.grid} strokeOpacity={0.6} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={12} interval="preserveStartEnd" />
            <YAxis tickFormatter={corto} tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<Globo verBruto={verBruto} />} cursor={{ fill: c.cursor, radius: 12 } as object} wrapperStyle={{ outline: "none" }} />
            {barras.map((b, i) => (
              <Bar key={b.key} dataKey={b.key} radius={[8, 8, 2, 2]} maxBarSize={30} fill={`url(#inicio-${b.key})`} animationDuration={800} animationBegin={i * 120} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
