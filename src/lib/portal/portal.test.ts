import { test } from "node:test";
import assert from "node:assert/strict";
import { REGLAS_POR_DEFECTO as R, minutosCobrados, montoDe, tarifaDe, requiereAprobacion, enGarantia, calcularEntrada, reglasDe, formatoHoras } from "./horas";
import { avanceDeProyecto, faseActual } from "./avance";
import { saldoCliente, pagadoDeFactura, estadoPorPago, faltaDeFases } from "./saldo";

test("redondeo: bloques de 15 y mínimo 30", () => {
  assert.equal(minutosCobrados(0, R), 0);
  assert.equal(minutosCobrados(5, R), 30);
  assert.equal(minutosCobrados(30, R), 30);
  assert.equal(minutosCobrados(31, R), 45);
  assert.equal(minutosCobrados(46, R), 60);
  assert.equal(minutosCobrados(61, R), 75);
});

test("monto según la tarifa por hora", () => {
  assert.equal(montoDe(60, 30), 30);
  assert.equal(montoDe(45, 30), 22.5);
  assert.equal(montoDe(75, 20), 25);
});

test("tarifa: propia, si no la de la línea", () => {
  assert.equal(tarifaDe({ brandLine: "normal" }, R), 40);
  assert.equal(tarifaDe({ brandLine: "premium" }, R), 30);
  assert.equal(tarifaDe({ brandLine: "premium", hourlyRate: "45.00" }, R), 45);
  assert.equal(tarifaDe({ brandLine: null, hourlyRate: null }, R), 40);
});

test("aprobación solo si el estimado pasa de 2 horas", () => {
  assert.equal(requiereAprobacion(120, R), false);
  assert.equal(requiereAprobacion(121, R), true);
  assert.equal(requiereAprobacion(null, R), false);
});

test("garantía de 90 días", () => {
  const hoy = new Date("2026-10-11T12:00:00Z");
  assert.equal(enGarantia("2026-08-01", hoy, R), true);
  assert.equal(enGarantia("2026-06-01", hoy, R), false);
  assert.equal(enGarantia(null, hoy, R), false);
  assert.equal(enGarantia("2026-12-01", hoy, R), false);
});

test("entrada en garantía registra tiempo y cobra 0", () => {
  assert.deepEqual(calcularEntrada(50, 30, R, { garantia: true }), { billedMinutes: 0, amount: 0, billable: false });
  assert.deepEqual(calcularEntrada(50, 30, R), { billedMinutes: 60, amount: 30, billable: true });
});

test("reglas desde CompanyConfig con Decimal en texto", () => {
  const r = reglasDe({ hourlyRateNormal: "35.00", hourlyRatePremium: "25", warrantyDays: 60 });
  assert.equal(r.tarifaNormal, 35);
  assert.equal(r.tarifaPremium, 25);
  assert.equal(r.garantiaDias, 60);
  assert.equal(r.redondeoMinutos, 15);
  assert.deepEqual(reglasDe(null), R);
});

test("formato de horas", () => {
  assert.equal(formatoHoras(30), "30 min");
  assert.equal(formatoHoras(120), "2 h");
  assert.equal(formatoHoras(105), "1 h 45 min");
});

test("avance: por precio solo si todas las fases tienen precio; si no, todas pesan igual", () => {
  const fases = [
    { id: "a", name: "Cobro", status: "hecha", progress: 0, price: "6800", sortOrder: 0 },
    { id: "b", name: "Facturación", status: "en_curso", progress: "50", price: 4200, sortOrder: 1 },
    { id: "c", name: "Conciliación", status: "pendiente", progress: 0, price: 0, sortOrder: 2 },
  ];
  // Una fase sin cobro: pesan igual (antes la de $0 no pesaba y el proyecto marcaba de más).
  assert.equal(avanceDeProyecto(fases), 50);
  assert.equal(avanceDeProyecto(fases.slice(0, 2)), Math.round(((6800 * 100 + 4200 * 50) / 11000) * 10) / 10);
  // El caso de HOLO: la fase cobrada terminada y tres incluidas a medias no es 100 %.
  assert.equal(avanceDeProyecto([
    { id: "1", name: "1", status: "hecha", progress: 100, price: 4500 },
    { id: "2", name: "2", status: "en_curso", progress: 71, price: 0 },
    { id: "3", name: "3", status: "en_curso", progress: 60, price: 0 },
    { id: "4", name: "4", status: "en_curso", progress: 50, price: 0 },
  ]), 70.3);
  assert.equal(faseActual(fases)?.id, "b");
  assert.equal(avanceDeProyecto([{ id: "x", name: "x", status: "en_curso", progress: 40, price: 0 }, { id: "y", name: "y", status: "pendiente", progress: 0, price: 0 }]), 20);
  assert.equal(avanceDeProyecto([]), 0);
});

test("saldo: facturado menos pagos confirmados", () => {
  const facturas = [{ id: "f1", status: "SENT", total: "1000" }, { id: "f2", status: "CANCELLED", total: 500 }, { id: "f3", status: "PARTIALLY_PAID", total: 300 }];
  const pagos = [{ documentId: "f1", amount: 400, status: "confirmado" }, { documentId: "f1", amount: 100, status: "por_confirmar" }, { documentId: "f3", amount: 300, status: "confirmado" }];
  assert.deepEqual(saldoCliente(facturas, pagos), { facturado: 1300, sinFacturar: 0, pagado: 700, porConfirmar: 100, pendiente: 600 });
  assert.equal(pagadoDeFactura("f1", pagos), 400);
  assert.equal(estadoPorPago(1000, 400), "PARTIALLY_PAID");
  assert.equal(estadoPorPago(300, 300), "PAID");
  assert.equal(estadoPorPago(300, 0), null);
});

test("saldo: factura marcada PAID sin amountPaid cuenta como pagada", () => {
  assert.deepEqual(saldoCliente([{ id: "v", status: "PAID", total: 1000, amountPaid: null }], []), { facturado: 1000, sinFacturar: 0, pagado: 1000, porConfirmar: 0, pendiente: 0 });
});

test("saldo: pagos viejos que solo viven en amountPaid y anticipos sin factura", () => {
  const facturas = [{ id: "f1", status: "PAID", total: 500, amountPaid: "500" }, { id: "f2", status: "PARTIALLY_PAID", total: 800, amountPaid: 200 }];
  const pagos = [{ documentId: "f2", amount: 300, status: "confirmado" }, { documentId: null, amount: 100, status: "confirmado" }];
  assert.deepEqual(saldoCliente(facturas, pagos), { facturado: 1300, sinFacturar: 0, pagado: 900, porConfirmar: 0, pendiente: 400 });
});

test("saldo: las fases iniciadas sin factura se deben aunque no tengan factura", () => {
  const facturas = [{ id: "f1", status: "SENT", total: 1000 }, { id: "fb", status: "DRAFT", total: 900 }];
  const fases = [
    { id: "a", status: "en_curso", price: 2200, invoiceId: null, invoice: null }, // se debe completa
    { id: "b", status: "pendiente", price: 800, invoice: null }, // no ha iniciado: no se debe
    { id: "c", status: "hecha", price: 1000, invoiceId: "f1", invoice: { status: "SENT" } }, // cuenta por su factura, no dos veces
    { id: "d", status: "en_revision", price: 900, invoiceId: "fb", invoice: { status: "DRAFT" } }, // factura en borrador: cuenta por la fase
    { id: "e", status: "en_curso", price: 500, billingPoint: "sin_cobro", invoice: null }, // no se cobra
  ];
  const pagos = [{ documentId: "f1", amount: 400, status: "confirmado" }, { documentId: null, phaseId: "a", amount: 300, status: "confirmado" }];
  // facturado 1000 + sin facturar (2200 + 900) − pagado (400 + 300) = 3400
  assert.deepEqual(saldoCliente(facturas, pagos, fases), { facturado: 1000, sinFacturar: 3100, pagado: 700, porConfirmar: 0, pendiente: 3400 });
  assert.deepEqual(faltaDeFases(fases, pagos).map((x) => [x.fase.id, x.falta]), [["a", 1900], ["d", 900]]);
  // Sin fases, el saldo es el de siempre.
  assert.equal(saldoCliente(facturas, pagos).pendiente, 300);
});
