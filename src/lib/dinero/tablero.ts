/**
 * Datos del tablero contable de /empresa/dinero. Puro: recibe facturas, pagos y gastos ya leídos y devuelve
 * filas planas (fechas en ISO) que el tablero del navegador filtra por año, mes y cliente sin volver al servidor.
 *
 * Qué cuenta como «entró»: lo mismo que ingresos.ts — cada pago confirmado en su fecha, y lo pagado de facturas
 * viejas sin filas de pago en la fecha de la factura. Esos cobros viejos van marcados `sinFecha` para que el
 * tablero los muestre aparte y se les pueda poner su fecha real (pedido de Javier, 2026-10-20).
 */
import { FACTURA_CUENTA, pagadoEfectivo } from "@/lib/portal/saldo";

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Mes «AAAA-MM» de una fecha en la hora de Panamá (UTC−5). */
export const mesDe = (d: Date) => new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 7);
/** paidAt es una fecha sin hora (medianoche UTC): al mediodía no cambia de día en Panamá. */
const mediodia = (d: Date) => new Date(`${d.toISOString().slice(0, 10)}T12:00:00Z`);

export type EstadoFactura = "pagada" | "parcial" | "pendiente" | "vencida" | "borrador" | "anulada";

export type FilaFactura = {
  id: string; numero: string; titulo: string; clienteId: string | null; cliente: string;
  fecha: string; vence: string | null; total: number; pagado: number; falta: number; estado: EstadoFactura; cuenta: boolean;
};
export type FilaEntrada = {
  id: string; fecha: string; monto: number; clienteId: string | null; cliente: string;
  facturaId: string | null; numero: string | null; metodo: string; referencia: string | null; sinFecha: boolean;
};
export type FilaGasto = { fecha: string; monto: number; categoria: string; titulo: string };
export type DatosTablero = { facturas: FilaFactura[]; entradas: FilaEntrada[]; gastos: FilaGasto[]; hoy: string };

type Cliente = { name: string; company: string | null } | null;
type Factura = { id: string; number: string | null; title: string; status: string; total: unknown; amountPaid: unknown; issueDate: Date; dueDate: Date | null; clientId: string | null; client: Cliente };
type Pago = { id: string; documentId: string | null; clientId: string | null; amount: unknown; status: string; paidAt: Date; method: string; reference: string | null; client: Cliente };
type Gasto = { amount: unknown; paidAt: Date | null; category: string; title: string };

const nombre = (c: Cliente) => c?.company || c?.name || "Sin cliente";

export function armarTablero(facturas: Factura[], pagos: Pago[], gastos: Gasto[], ahora = new Date()): DatosTablero {
  const confirmados = pagos.filter((p) => p.status === "confirmado");
  const porId = new Map(facturas.map((f) => [f.id, f]));

  const filasFactura: FilaFactura[] = facturas.map((f) => {
    const cuenta = FACTURA_CUENTA(f.status);
    const total = r2(n(f.total));
    const pagado = cuenta ? r2(Math.min(total, pagadoEfectivo(f, confirmados))) : 0;
    const falta = cuenta ? r2(Math.max(0, total - pagado)) : 0;
    const vencida = falta > 0.005 && !!f.dueDate && f.dueDate < ahora;
    const estado: EstadoFactura = f.status === "DRAFT" ? "borrador"
      : !cuenta ? "anulada"
      : falta <= 0.005 ? "pagada"
      : vencida ? "vencida"
      : pagado > 0.005 ? "parcial" : "pendiente";
    return { id: f.id, numero: f.number ?? "Sin número", titulo: f.title, clienteId: f.clientId, cliente: nombre(f.client), fecha: f.issueDate.toISOString(), vence: f.dueDate?.toISOString() ?? null, total, pagado, falta, estado, cuenta };
  });

  const entradas: FilaEntrada[] = confirmados.map((p) => {
    const f = p.documentId ? porId.get(p.documentId) : undefined;
    return { id: p.id, fecha: mediodia(p.paidAt).toISOString(), monto: r2(n(p.amount)), clienteId: p.clientId ?? f?.clientId ?? null, cliente: nombre(p.client ?? f?.client ?? null), facturaId: p.documentId, numero: f?.number ?? null, metodo: p.method, referencia: p.reference, sinFecha: false };
  });
  for (const f of facturas) {
    if (f.status === "DRAFT" || f.status === "CANCELLED") continue;
    const enFilas = confirmados.filter((p) => p.documentId === f.id).reduce((a, p) => a + n(p.amount), 0);
    const viejo = r2(pagadoEfectivo(f, confirmados) - enFilas);
    if (viejo > 0.005) entradas.push({ id: `viejo-${f.id}`, fecha: f.issueDate.toISOString(), monto: viejo, clienteId: f.clientId, cliente: nombre(f.client), facturaId: f.id, numero: f.number, metodo: "otro", referencia: null, sinFecha: true });
  }
  entradas.sort((a, b) => b.fecha.localeCompare(a.fecha));

  const filasGasto: FilaGasto[] = gastos.filter((g) => g.paidAt).map((g) => ({ fecha: g.paidAt!.toISOString(), monto: r2(n(g.amount)), categoria: g.category, titulo: g.title }));

  return { facturas: filasFactura.sort((a, b) => b.fecha.localeCompare(a.fecha)), entradas, gastos: filasGasto, hoy: ahora.toISOString() };
}

/** Meses «AAAA-MM» desde `desde` hasta `hasta`, ambos incluidos. */
export function mesesEntre(desde: string, hasta: string): string[] {
  const out: string[] = [];
  let [y, m] = desde.split("-").map(Number);
  const [yh, mh] = hasta.split("-").map(Number);
  while (y < yh || (y === yh && m <= mh)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}
