import { test } from "node:test";
import assert from "node:assert/strict";
import { pagosDelPlan } from "./saldo";

// El plan de BJ Capital: USD 3,500, USD 1,000 en canje, 50 % al firmar y 50 % a la entrega.
const plan5050 = {
  mode: "MILESTONES", total: 3500, barter: { amount: 1000, description: "Canje por estadías" }, frequency: "MONTHLY", downPayment: 0, firstDueDate: "", installments: 1,
  milestones: [
    { dueDate: "", percent: 50, trigger: "SIGNING", description: "50 % al firmar" },
    { dueDate: "", percent: 50, trigger: "DELIVERY", description: "50 % a la entrega" },
  ],
};

test("50/50 sin pagos: toca el de la firma, el de la entrega va después", () => {
  const p = pagosDelPlan(plan5050, 0, { proyecto: "BJ", entregado: false })!;
  assert.equal(p.resumen, "50 / 50");
  assert.deepEqual(p.filas.map((f) => [f.etiqueta, f.monto, f.estado]), [["50 % al firmar", 1250, "toca"], ["50 % a la entrega", 1250, "despues"]]);
  assert.equal(p.canje?.monto, 1000);
  assert.equal(p.efectivo, 2500);
  assert.equal(p.total, 3500);
});

test("50/50 con el primer pago hecho: firma pagada, entrega pendiente", () => {
  const p = pagosDelPlan(plan5050, 1250, { proyecto: "BJ", entregado: false })!;
  assert.deepEqual(p.filas.map((f) => f.estado), ["pagado", "despues"]);
});

test("pago parcial y proyecto entregado: los dos tocan, lo pagado cubre primero la firma", () => {
  const p = pagosDelPlan(plan5050, 500, { proyecto: "BJ", entregado: true })!;
  assert.deepEqual(p.filas.map((f) => [f.pagado, f.falta, f.estado]), [[500, 750, "toca"], [0, 1250, "toca"]]);
});

test("plan por cuotas: abono al firmar y cuotas por fecha", () => {
  const p = pagosDelPlan({ mode: "INSTALLMENTS", total: 3000, downPayment: 1000, installments: 2, frequency: "MONTHLY", firstDueDate: "2026-10-01" }, 0, { proyecto: "X", entregado: false, ahora: new Date("2026-10-19T12:00:00Z") })!;
  assert.deepEqual(p.filas.map((f) => [f.monto, f.estado]), [[1000, "toca"], [1000, "toca"], [1000, "despues"]]);
});

test("sin plan no hay nada que mostrar", () => {
  assert.equal(pagosDelPlan(null, 0, { proyecto: "X", entregado: false }), null);
});
