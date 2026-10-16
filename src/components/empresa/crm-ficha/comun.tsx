/** Piezas chicas compartidas por la ficha 360 del cliente. Sin estado: sirven en servidor y en cliente. */
import type { EstadoCrm } from "@/app/(empresa)/empresa/(protected)/acciones-crm-ficha";

export const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
export const h2 = "text-fg text-base font-semibold tracking-tight";
export const enlace = "inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline";
export const botonChico = "inline-flex items-center justify-center min-h-11 sm:min-h-9 px-3 rounded-lg text-sm font-semibold text-fg-mute hover:text-fg hover:bg-fill disabled:opacity-40 whitespace-nowrap";
export const chip = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** «16 oct 2026 · 14:30» en hora de Panamá (UTC-5 fijo). Igual en servidor y navegador: no hay salto al hidratar. */
export function fechaHora(iso: string | Date, conHora = true): string {
  const d = new Date(new Date(iso).getTime() - 5 * 3_600_000);
  if (Number.isNaN(d.getTime())) return "—";
  const base = `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return conHora ? `${base} · ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}` : base;
}

export function Resultado({ estado }: { estado: EstadoCrm }) {
  if (!estado) return null;
  if (estado.error) return <p className="text-sm text-danger" role="alert">{estado.error}</p>;
  if (estado.mensaje) return <p className="text-sm text-ok" role="status">{estado.mensaje}</p>;
  return null;
}
