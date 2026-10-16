// Formato de dinero del portal. Sin base de datos: lo usan también componentes del navegador.
const fmt = new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
export function dinero(v: unknown): string {
  const n = Number(v);
  return fmt.format(Number.isFinite(n) ? n : 0);
}
