import { test } from "node:test";
import assert from "node:assert/strict";
import { diaValido, inicioDeMesPanama, lineaMantenimiento, mesPanama, tocaFacturar, type ProyectoMantenimiento } from "./mantenimiento-reglas";

// 10:00 en Panamá del día pedido
const el = (d: string) => new Date(`${d}T15:00:00.000Z`);
const p = (o: Partial<ProyectoMantenimiento> = {}): ProyectoMantenimiento => ({
  status: "ACTIVE", mantenimientoActivo: true, mantenimientoMonto: 150, mantenimientoDia: 5, mantenimientoUltimoAt: null, ...o,
});

test("se factura el día elegido del mes", () => {
  assert.equal(tocaFacturar(p(), el("2026-10-05")), true);
  assert.equal(tocaFacturar(p(), el("2026-10-04")), false, "antes del día, no");
});

test("si el día ya pasó y este mes no se facturó, se factura", () => {
  assert.equal(tocaFacturar(p({ mantenimientoUltimoAt: el("2026-09-05") }), el("2026-10-09")), true);
});

test("una sola factura por mes", () => {
  assert.equal(tocaFacturar(p({ mantenimientoUltimoAt: el("2026-10-05") }), el("2026-10-06")), false);
  assert.equal(tocaFacturar(p({ mantenimientoUltimoAt: el("2026-10-05") }), el("2026-11-05")), true, "al mes siguiente, sí");
});

test("el mes se cuenta en hora de Panamá", () => {
  // 1 nov 03:00 UTC = 31 oct 22:00 en Panamá: todavía es octubre
  assert.equal(mesPanama(new Date("2026-11-01T03:00:00Z")), "2026-10");
  assert.equal(tocaFacturar(p({ mantenimientoDia: 1, mantenimientoUltimoAt: el("2026-10-01") }), new Date("2026-11-01T03:00:00Z")), false);
  assert.equal(inicioDeMesPanama(el("2026-10-20")).toISOString(), "2026-10-01T05:00:00.000Z");
});

test("no se factura si está apagado, sin monto o el proyecto no está activo", () => {
  assert.equal(tocaFacturar(p({ mantenimientoActivo: false }), el("2026-10-05")), false);
  assert.equal(tocaFacturar(p({ mantenimientoMonto: null }), el("2026-10-05")), false);
  assert.equal(tocaFacturar(p({ mantenimientoMonto: 0 }), el("2026-10-05")), false);
  assert.equal(tocaFacturar(p({ status: "PAUSED" }), el("2026-10-05")), false);
});

test("el día va de 1 a 28", () => {
  assert.equal(diaValido(1), 1);
  assert.equal(diaValido(28), 28);
  assert.equal(diaValido(29), null);
  assert.equal(diaValido(0), null);
  assert.equal(diaValido("abc"), null);
});

test("la línea de la factura dice el mes", () => {
  assert.equal(lineaMantenimiento(el("2026-10-05")), "Mantenimiento mensual · octubre 2026");
});
