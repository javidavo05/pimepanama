"use client";

import dynamic from "next/dynamic";

// recharts es pesado — ssr:false lo saca por completo del bundle inicial
// (solo se carga en el cliente tras el montaje). Requiere un wrapper "use
// client" porque ssr:false no está permitido directamente en un Server
// Component.
export const LazyDashboardRevenueChart = dynamic(
  () => import("./revenue-chart").then((m) => m.DashboardRevenueChart),
  { ssr: false, loading: () => <div className="h-[240px]" /> }
);

export const LazyRevenueChart = dynamic(
  () => import("./revenue-chart").then((m) => m.RevenueChart),
  { ssr: false, loading: () => <div className="h-[220px]" /> }
);
