// Pure data helpers — no "use client", importable from server and client components

export interface RevenueDataPoint {
  month: string;
  bruto: number;
  neto: number;
  count: number;
}

export interface YearlyRevenuePoint {
  year: string;
  bruto: number;
  neto: number;
  count: number;
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

export function buildYearlyRevenue(documents: {
  issueDate: Date;
  total: unknown;
  netAmount: unknown;
}[]): YearlyRevenuePoint[] {
  const map = new Map<string, { bruto: number; neto: number; count: number }>();
  for (const doc of documents) {
    const year = String(new Date(doc.issueDate).getFullYear());
    const ex = map.get(year) ?? { bruto: 0, neto: 0, count: 0 };
    ex.bruto += Number(doc.total ?? 0);
    ex.neto += Number(doc.netAmount ?? doc.total ?? 0);
    ex.count += 1;
    map.set(year, ex);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, v]) => ({ year, ...v }));
}
