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

test("lo que falta emitir sigue debiéndose aunque no tenga fecha", () => {
  const facturas = [{ id: "a", status: "PARTIALLY_PAID", total: 4500, amountPaid: 2250 }];
  const vistas = facturasEmitidas(facturas, [], [], hoy);
  assert.equal(vistas[0].total, 2250);
  assert.equal(vistas[0].totalContrato, 4500);
  const s = saldoCliente(vistas, []);
  assert.equal(s.facturado, 2250);
  assert.equal(s.porEmitir, 2250);
  assert.equal(s.pagado, 2250);
  assert.equal(s.pendiente, 2250);
});

test("proyecto cobrado por su plan (50/50 con canje) se debe antes de facturarlo", async () => {
  const { planSinFacturar, faltaDePlan } = await import("./saldo");
  const plan = { mode: "MILESTONES", total: 3500, downPayment: 0, installments: 1, frequency: "MONTHLY", firstDueDate: "", barter: { amount: 1000, description: "canje" } };
  const bj = { financingPlan: plan, documents: [], _count: { phases: 0 } };
  assert.equal(planSinFacturar(bj), 2500);
  assert.equal(saldoCliente([], [], [], [bj]).pendiente, 2500);
  // Un pago sin factura del proyecto baja la deuda una sola vez.
  const pago = { documentId: null, amount: 1250, status: "confirmado" };
  assert.equal(saldoCliente([], [pago], [], [bj]).pendiente, 1250);
  assert.equal(faltaDePlan(bj, [pago]), 1250);
  // Ya facturado el primer 50 %: el plan solo suma lo que falta facturar.
  const conFactura = { ...bj, documents: [{ status: "SENT", total: 1250 }] };
  assert.equal(planSinFacturar(conFactura), 1250);
  assert.equal(saldoCliente([{ id: "f", status: "SENT", total: 1250 }], [], [], [conFactura]).pendiente, 2500);
  // Si el proyecto se cobra por fases con precio, el plan no se suma encima.
  assert.equal(planSinFacturar({ ...bj, _count: { phases: 1 } }), 0);
  // Sin plan, nada.
  assert.equal(planSinFacturar({ financingPlan: null, documents: [], _count: { phases: 0 } }), 0);
});
