"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import type { RevenueDataPoint, YearlyRevenuePoint } from "@/lib/revenue-helpers";

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
    <div className="bg-[#0d0d18] border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl text-sm">
      <p className="text-white/60 font-semibold mb-2">{label}</p>
      <p className="text-[#1AA7F0] font-mono">Bruto: ${payload[0]?.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
      <p className="text-green-400 font-mono">Neto: ${payload[1]?.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
      <p className="text-white/55 text-xs mt-1">{payload[0]?.payload?.count} cotizaciones aceptadas</p>
    </div>
  );
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  title?: string;
}

export function RevenueChart({ data, title }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-white/50 text-sm">
        Sin datos de cotizaciones aceptadas aún
      </div>
    );
  }
  return (
    <div>
      {title && <p className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Legend wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", paddingTop: "12px" }} formatter={(v) => v === "bruto" ? "Bruto" : "Neto recibido"} />
          <Bar dataKey="bruto" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {data.map((_, i) => <Cell key={i} fill="#1AA7F0" fillOpacity={0.7} />)}
          </Bar>
          <Bar dataKey="neto" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {data.map((_, i) => <Cell key={i} fill="#22c55e" fillOpacity={0.6} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DashboardTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d0d18] border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl text-sm">
      <p className="text-white/60 font-semibold mb-2">{label}</p>
      <p className="text-[#1AA7F0] font-mono">Bruto: ${payload[0]?.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
      <p className="text-green-400 font-mono">Neto: ${payload[1]?.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
      <p className="text-white/55 text-xs mt-1">{payload[0]?.payload?.count} docs aceptados</p>
    </div>
  );
}

interface DashboardRevenueChartProps {
  monthlyData: RevenueDataPoint[];
  yearlyData: YearlyRevenuePoint[];
}

export function DashboardRevenueChart({ monthlyData, yearlyData }: DashboardRevenueChartProps) {
  const [view, setView] = useState<"month" | "year">("month");

  const isEmpty = monthlyData.length === 0 && yearlyData.length === 0;
  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-48 text-white/50 text-sm">
        Sin ingresos registrados aún
      </div>
    );
  }

  const chartData =
    view === "month"
      ? monthlyData.slice(-12).map((d) => ({ label: d.month, bruto: d.bruto, neto: d.neto, count: d.count }))
      : yearlyData.map((d) => ({ label: d.year, bruto: d.bruto, neto: d.neto, count: d.count }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-white/60 text-xs uppercase tracking-widest font-medium">Rendimiento económico</p>
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.06]">
          {(["month", "year"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${view === v ? "bg-[#1AA7F0]/15 text-[#1AA7F0] border border-[#1AA7F0]/20" : "text-white/55 hover:text-white/60"}`}>
              {v === "month" ? "Por mes" : "Por año"}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip content={<DashboardTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Legend wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", paddingTop: "12px" }} formatter={(v) => (v === "bruto" ? "Bruto" : "Neto recibido")} />
          <Bar dataKey="bruto" radius={[3, 3, 0, 0]} maxBarSize={36}>
            {chartData.map((_, i) => <Cell key={i} fill="#1AA7F0" fillOpacity={0.7} />)}
          </Bar>
          <Bar dataKey="neto" radius={[3, 3, 0, 0]} maxBarSize={36}>
            {chartData.map((_, i) => <Cell key={i} fill="#22c55e" fillOpacity={0.6} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
