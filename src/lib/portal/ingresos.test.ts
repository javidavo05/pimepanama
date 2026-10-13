import { test } from "node:test";
import assert from "node:assert/strict";
import { ingresosDelCliente } from "./ingresos";

const d = (s: string) => new Date(`${s}T12:00:00Z`);

test("ingresos: pagos en su fecha y facturas viejas sin filas de pago en la fecha de la factura", () => {
  const facturas = [
    { id: "vieja", status: "PAID", total: 500, amountPaid: null, issueDate: d("2025-07-06"), projectId: null },
    { id: "fase", status: "PARTIALLY_PAID", total: 2500, amountPaid: 1300, issueDate: d("2026-10-12"), projectId: "genius" },
    { id: "borrador", status: "DRAFT", total: 900, amountPaid: 0, issueDate: d("2026-10-01"), projectId: null },
  ];
  const pagos = [
    { documentId: "fase", amount: 300, status: "confirmado", paidAt: d("2026-08-28") },
    { documentId: "fase", amount: 500, status: "confirmado", paidAt: d("2026-09-17") },
    { documentId: "fase", amount: 500, status: "confirmado", paidAt: d("2026-10-06") },
    { documentId: "fase", amount: 999, status: "por_confirmar", paidAt: d("2026-10-10") },
  ];
  const r = ingresosDelCliente(facturas, pagos);
  assert.equal(r.total, 1800);
  assert.equal(r.entradas, 4);
  assert.deepEqual(r.porAnio, [{ anio: 2025, monto: 500 }, { anio: 2026, monto: 1300 }]);
  assert.equal(r.porProyecto.get("genius"), 1300);
  assert.equal(r.desde?.toISOString().slice(0, 10), "2025-07-06");
});

test("ingresos: un pago abonado a una factura marcada PAID no se cuenta dos veces", () => {
  const r = ingresosDelCliente(
    [{ id: "f", status: "PAID", total: 1000, amountPaid: 1000, issueDate: d("2026-08-18"), projectId: null }],
    [{ documentId: "f", amount: 1000, status: "confirmado", paidAt: d("2026-08-20") }],
  );
  assert.equal(r.total, 1000);
  assert.equal(r.entradas, 1);
});

test("ingresos: cliente sin nada", () => {
  const r = ingresosDelCliente([], []);
  assert.equal(r.total, 0);
  assert.equal(r.desde, null);
  assert.deepEqual(r.porAnio, []);
});
