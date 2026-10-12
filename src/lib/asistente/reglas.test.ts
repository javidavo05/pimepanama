import test from "node:test";
import assert from "node:assert/strict";
import { requiereConfirmacion } from "./reglas";

test("lo chico y claro se hace solo", () => {
  assert.equal(requiereConfirmacion({ monto: 300 }).confirmar, false);
  assert.equal(requiereConfirmacion({ monto: 500 }).confirmar, false);
  assert.equal(requiereConfirmacion({ monto: 999.99 }).confirmar, false);
  assert.equal(requiereConfirmacion({}).confirmar, false); // tarea, nota, estado de fase
  assert.equal(requiereConfirmacion({ registros: 10 }).confirmar, false);
});

test("USD 1,000 o más se confirma, también en un cambio hacia abajo", () => {
  assert.equal(requiereConfirmacion({ monto: 1000 }).confirmar, true);
  assert.equal(requiereConfirmacion({ monto: 2500 }).confirmar, true);
  assert.equal(requiereConfirmacion({ monto: -1200 }).confirmar, true);
  assert.match(requiereConfirmacion({ monto: 2500 }).motivo ?? "", /2,500\.00/);
});

test("borrar, anular, factura emitida, plan con pagos y más de 10 registros se confirman", () => {
  assert.equal(requiereConfirmacion({ destruye: true, monto: 10 }).confirmar, true);
  assert.equal(requiereConfirmacion({ facturaEmitida: true }).confirmar, true);
  assert.equal(requiereConfirmacion({ planConPagos: true, monto: 50 }).confirmar, true);
  assert.equal(requiereConfirmacion({ registros: 11 }).confirmar, true);
});

test("varios pagos en un pedido: cada uno por su monto", () => {
  const r = [300, 2500, 500].map((monto) => requiereConfirmacion({ monto }).confirmar);
  assert.deepEqual(r, [false, true, false]);
});

test("montos raros no rompen la regla", () => {
  assert.equal(requiereConfirmacion({ monto: Number.NaN }).confirmar, false);
  assert.equal(requiereConfirmacion({ monto: null }).confirmar, false);
});
