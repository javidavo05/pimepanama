"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

type Property = {
  id: string;
  title: string;
  type: "apartment" | "house" | "commercial" | "land";
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqm: number;
  location: string;
  status: "for-sale" | "for-rent" | "sold";
  amenities: string[];
};

const PROPERTIES: Property[] = [
  { id: "pr1", title: "Penthouse Vista al Mar", type: "apartment", price: 850000, bedrooms: 4, bathrooms: 3, sqm: 320, location: "Punta Pacífica, Panamá", status: "for-sale", amenities: ["Pool", "Gym", "Parking", "Ocean View", "24h Security"] },
  { id: "pr2", title: "Casa en Clayton", type: "house", price: 3200, bedrooms: 3, bathrooms: 2, sqm: 200, location: "Clayton, Panamá", status: "for-rent", amenities: ["Garden", "Parking", "Gated"] },
  { id: "pr3", title: "Apartamento Balboa Ave", type: "apartment", price: 280000, bedrooms: 2, bathrooms: 2, sqm: 120, location: "Bella Vista, Panamá", status: "for-sale", amenities: ["Pool", "Gym", "Parking"] },
  { id: "pr4", title: "Local Comercial Via España", type: "commercial", price: 5500, bedrooms: 0, bathrooms: 1, sqm: 85, location: "Via España, Panamá", status: "for-rent", amenities: ["AC", "Security", "High Traffic"] },
  { id: "pr5", title: "Residencia en Coronado", type: "house", price: 450000, bedrooms: 5, bathrooms: 4, sqm: 450, location: "Coronado, Chiriquí", status: "for-sale", amenities: ["Pool", "Garden", "Beach Access"] },
  { id: "pr6", title: "Studio Marbella", type: "apartment", price: 1400, bedrooms: 1, bathrooms: 1, sqm: 55, location: "Marbella, Panamá", status: "for-rent", amenities: ["Gym", "Rooftop"] },
];

const TYPE_ICONS: Record<Property["type"], string> = {
  apartment: "ph:buildings",
  house: "ph:house",
  commercial: "ph:storefront",
  land: "ph:tree",
};

function fmtPrice(price: number, status: string) {
  if (status === "for-rent") return `$${price.toLocaleString()}/mes`;
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(2)}M`;
  return `$${price.toLocaleString()}`;
}

export function BnbPropertySearch() {
  const [statusFilter, setStatusFilter] = useState<"all" | "for-sale" | "for-rent">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | Property["type"]>("all");
  const [selected, setSelected] = useState<Property | null>(null);

  const filtered = PROPERTIES.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    return true;
  });

  const STATUS_STYLE = {
    "for-sale": { label: "En venta", bg: "bg-[#2563EB]/15", text: "text-[#60A5FA]", border: "border-[#2563EB]/25" },
    "for-rent": { label: "En alquiler", bg: "bg-[#22c55e]/15", text: "text-[#22c55e]", border: "border-[#22c55e]/25" },
    "sold": { label: "Vendido", bg: "bg-white/5", text: "text-white/30", border: "border-white/10" },
  };

  return (
    <div className="space-y-4">
      {/* filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {(["all", "for-sale", "for-rent"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                statusFilter === s
                  ? "border-[#2563EB]/50 bg-[#2563EB]/20 text-[#60A5FA]"
                  : "border-white/10 text-white/40 hover:border-white/20"
              }`}
            >
              {s === "all" ? "Todos" : s === "for-sale" ? "Venta" : "Alquiler"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "apartment", "house", "commercial"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                typeFilter === t
                  ? "border-[#2563EB]/50 bg-[#2563EB]/20 text-[#60A5FA]"
                  : "border-white/10 text-white/40 hover:border-white/20"
              }`}
            >
              {t === "all" ? "Tipo" : t === "apartment" ? "Apto" : t === "house" ? "Casa" : "Comercial"}
            </button>
          ))}
        </div>
      </div>

      {/* stats bar */}
      <div className="flex gap-4 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs">
        <span className="text-white/40">{filtered.length} propiedades</span>
        <span className="text-white/20">·</span>
        <span className="text-white/40">
          Valor promedio: {statusFilter === "for-rent"
            ? `$${Math.round(filtered.filter(p => p.status === "for-rent").reduce((a, b) => a + b.price, 0) / Math.max(filtered.filter(p => p.status === "for-rent").length, 1)).toLocaleString()}/mes`
            : `$${Math.round(filtered.filter(p => p.status === "for-sale").reduce((a, b) => a + b.price, 0) / Math.max(filtered.filter(p => p.status === "for-sale").length, 1)).toLocaleString()}`
          }
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => {
          const ss = STATUS_STYLE[p.status];
          return (
            <motion.button
              key={p.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(selected?.id === p.id ? null : p)}
              className={`text-left rounded-2xl border p-4 transition ${
                selected?.id === p.id
                  ? "border-[#2563EB]/50 bg-[#2563EB]/10"
                  : "border-white/8 bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/15">
                  <Icon icon={TYPE_ICONS[p.type]} className="h-5 w-5 text-[#60A5FA]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug text-white">{p.title}</p>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase ${ss.bg} ${ss.text} ${ss.border}`}>
                      {ss.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40">{p.location}</p>
                  <p className="mt-1 text-sm font-bold text-[#60A5FA]">{fmtPrice(p.price, p.status)}</p>
                </div>
              </div>

              {p.bedrooms > 0 && (
                <div className="mt-3 flex gap-4 text-[10px] text-white/40">
                  <span className="flex items-center gap-1"><Icon icon="ph:bed" className="h-3 w-3" /> {p.bedrooms} hab</span>
                  <span className="flex items-center gap-1"><Icon icon="ph:bathtub" className="h-3 w-3" /> {p.bathrooms} baños</span>
                  <span className="flex items-center gap-1"><Icon icon="ph:ruler" className="h-3 w-3" /> {p.sqm} m²</span>
                </div>
              )}

              <AnimatePresence>
                {selected?.id === p.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-white/8">
                      {p.amenities.map((a) => (
                        <span key={a} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/50">{a}</span>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="flex-1 rounded-xl bg-[#2563EB]/20 py-2 text-[10px] font-bold uppercase tracking-wider text-[#60A5FA] transition hover:bg-[#2563EB]/30">
                        Solicitar visita
                      </button>
                      <button className="flex-1 rounded-xl border border-white/10 py-2 text-[10px] font-bold uppercase tracking-wider text-white/40 transition hover:border-white/20">
                        Ver PDF
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
