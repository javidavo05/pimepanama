import { test } from "node:test";
import assert from "node:assert/strict";
import { emitidoDe, facturasEmitidas, saldoCliente } from "./saldo";

const hoy = new Date("2026-10-16T12:00:00Z");
const cuota = (documentId: string, amount: number, fecha: string, status = "PENDING") => ({ documentId, amount, dueDate: new Date(fecha), status });

test("contrato sin plan con anticipo: solo se ve lo pagado y el resto queda por emitir", () => {
  assert.deepEqual(emitidoDe(4500, 2250, [], hoy), { emitido: 2250, porEmitir: 2250, proxima: null });
});

test("contrato con cuotas: lo pagado más las vencidas; la siguiente se anuncia", () => {
  const cs = [cuota("d", 1000, "2026-10-01"), cuota("d", 1000, "2026-11-01"), cuota("d", 1000, "2026-12-01")];
  const r = emitidoDe(14500, 3500, cs, hoy);
  assert.equal(r.emitido, 4500);
  assert.equal(r.porEmitir, 10000);
  assert.equal(r.proxima?.monto, 1000);
});

test("factura sin pagos ni plan se emite entera; pagada completa también", () => {
  assert.equal(emitidoDe(150, 0, [], hoy).emitido, 150);
  assert.equal(emitidoDe(500, 500, [], hoy).emitido, 500);
});

test("el saldo del cliente solo cuenta lo emitido", () => {
  const facturas = [{ id: "a", status: "PARTIALLY_PAID", total: 4500, amountPaid: 2250 }];
  const vistas = facturasEmitidas(facturas, [], [], hoy);
  assert.equal(vistas[0].total, 2250);
  assert.equal(vistas[0].totalContrato, 4500);
  assert.equal(saldoCliente(vistas, []).pendiente, 0);
});
