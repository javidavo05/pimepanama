const DEFAULT_OPTS: Intl.DateTimeFormatOptions = {
  timeZone: "America/Panama",
};

/** Normaliza espacios de ICU (NBSP / narrow NBSP) para evitar hydration mismatch. */
function normalizeLocaleSpaces(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, " ");
}

/** Fecha/hora en español Panamá — seguro para SSR y cliente. */
export function formatDateTimeEsPa(
  iso: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return normalizeLocaleSpaces(
    date.toLocaleString("es-PA", {
      ...DEFAULT_OPTS,
      ...options,
    })
  );
}

export function formatEmailReceivedAt(iso: string | Date): string {
  return formatDateTimeEsPa(iso, { dateStyle: "full", timeStyle: "short" });
}

/**
 * Fechas que se pintan igual en el servidor y en cualquier navegador. Safari y
 * Node formatean `toLocaleDateString("es-PA")` distinto (orden, ceros, meses
 * abreviados), y esa diferencia rompe la hidratación de React en el iPhone.
 *
 * Se lee el día en UTC, igual que lo pintaba el servidor: las fechas de
 * calendario (vencimientos, inicio, reunión) se guardan como medianoche UTC y
 * pasarlas a la hora de Panamá las correría al día anterior.
 */
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

function aFecha(iso: string | Date): Date | null {
  const date = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** «09/24/2026» (mes/día/año, como es-PA). */
export function fechaCorta(iso: string | Date): string {
  const d = aFecha(iso);
  if (!d) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${mm}/${dd}/${d.getUTCFullYear()}`;
}

/** «24 sept». */
export function fechaDiaMes(iso: string | Date): string {
  const d = aFecha(iso);
  if (!d) return "—";
  return `${d.getUTCDate()} ${MESES_CORTOS[d.getUTCMonth()]}`;
}
