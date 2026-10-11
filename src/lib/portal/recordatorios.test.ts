import { test } from "node:test";
import assert from "node:assert/strict";
import { etapaDe } from "./recordatorios";

test("etapas del recordatorio de cobro", () => {
  const hoy = new Date("2026-10-11T13:00:00Z");
  assert.equal(etapaDe(new Date("2026-10-14T00:00:00Z"), hoy), "antes");
  assert.equal(etapaDe(new Date("2026-10-11T23:00:00Z"), hoy), "hoy");
  assert.equal(etapaDe(new Date("2026-10-04T00:00:00Z"), hoy), "vencida");
  assert.equal(etapaDe(new Date("2026-10-12T00:00:00Z"), hoy), null);
  assert.equal(etapaDe(new Date("2026-10-05T00:00:00Z"), hoy), null);
});

import { cierreDeMes, hoyEnPanama } from "./factura-mensual";

test("cierre de mes: días 1 a 3 en hora de Panamá, hasta el último día del mes anterior", () => {
  // 1 de noviembre 02:00 en Panamá = 07:00 UTC
  assert.equal(cierreDeMes(new Date("2026-11-01T07:00:00Z"))?.toISOString(), "2026-10-31T00:00:00.000Z");
  // 31 de octubre 22:00 en Panamá = 1 nov 03:00 UTC: todavía es octubre allá
  assert.equal(cierreDeMes(new Date("2026-11-01T03:00:00Z")), null);
  assert.equal(cierreDeMes(new Date("2026-11-03T20:00:00Z"))?.toISOString(), "2026-10-31T00:00:00.000Z");
  assert.equal(cierreDeMes(new Date("2026-11-04T12:00:00Z")), null);
  // enero cierra diciembre del año anterior
  assert.equal(cierreDeMes(new Date("2027-01-02T12:00:00Z"))?.toISOString(), "2026-12-31T00:00:00.000Z");
  assert.deepEqual(hoyEnPanama(new Date("2026-03-01T04:59:00Z")), { anio: 2026, mes: 1, dia: 28 });
});
