"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";

export interface RevenueDataPoint {
  month: string;
  bruto: number;
  neto: number;
  count: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  title?: string;
}

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
      <p className="text-white/30 text-xs mt-1">{payload[0]?.payload?.count} cotizaciones aceptadas</p>
    </div>
  );
}

export function RevenueChart({ data, title }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-white/20 text-sm">
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
          <XAxis
            dataKey="month"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", paddingTop: "12px" }}
            formatter={(v) => v === "bruto" ? "Bruto" : "Neto recibido"}
          />
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

export function buildMonthlyRevenue(documents: {
  issueDate: Date;
  total: unknown;
  netAmount: unknown;
}[]): RevenueDataPoint[] {
  const map = new Map<string, { bruto: number; neto: number; count: number }>();
  for (const doc of documents) {
    const d = new Date(doc.issueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-PA", { month: "short", year: "2-digit" });
    const existing = map.get(key) ?? { bruto: 0, neto: 0, count: 0 };
    existing.bruto += Number(doc.total ?? 0);
    existing.neto += Number(doc.netAmount ?? doc.total ?? 0);
    existing.count += 1;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const [year, month] = key.split("-");
      const d = new Date(Number(year), Number(month) - 1, 1);
      return {
        month: d.toLocaleDateString("es-PA", { month: "short", year: "2-digit" }),
        ...v,
      };
    });
}
