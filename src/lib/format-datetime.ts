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
