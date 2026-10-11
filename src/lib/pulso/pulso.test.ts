import { test } from "node:test";
import assert from "node:assert/strict";
import { firmar, secretoDe, verificarFirma } from "./firma";
import { alertaPorCambio, huellaDeError, keyDesdeNombre, nivelDe, trasSondeo } from "./reglas";

test("firma: válida, alterada, reloj fuera de margen y en segundos", () => {
  const sec = secretoDe("maestro", "tienda-ab12", 1);
  assert.notEqual(sec, secretoDe("maestro", "tienda-ab12", 2), "rotar la versión cambia el secreto");
  const ahora = 1_760_000_000_000;
  const ts = String(ahora);
  const cuerpo = '{"id":"evt-12345678","type":"heartbeat"}';
  const f = firmar(sec, ts, cuerpo);
  assert.equal(verificarFirma({ secreto: sec, timestamp: ts, cuerpo, firma: f, ahora }), "ok");
  assert.equal(verificarFirma({ secreto: sec, timestamp: ts, cuerpo: cuerpo + " ", firma: f, ahora }), "firma");
  assert.equal(verificarFirma({ secreto: sec, timestamp: ts, cuerpo, firma: "zz", ahora }), "firma");
  assert.equal(verificarFirma({ secreto: sec, timestamp: ts, cuerpo, firma: f, ahora: ahora + 6 * 60_000 }), "reloj");
  assert.equal(verificarFirma({ secreto: sec, timestamp: String(ahora / 1000), cuerpo, firma: f, ahora }), "reloj");
  assert.equal(verificarFirma({ secreto: sec, timestamp: null, cuerpo, firma: f, ahora }), "reloj");
});

test("sondeo: un fallo no tumba, dos sí; uno bueno lo levanta", () => {
  assert.deepEqual(trasSondeo({ status: "ok", failCount: 0 }, false), { status: "ok", failCount: 1 });
  assert.deepEqual(trasSondeo({ status: "ok", failCount: 1 }, false), { status: "caido", failCount: 2 });
  assert.deepEqual(trasSondeo({ status: "caido", failCount: 5 }, true), { status: "ok", failCount: 0 });
  assert.deepEqual(trasSondeo({ status: "sin_senal", failCount: 0 }, true), { status: "ok", failCount: 0 });
  assert.deepEqual(trasSondeo({ status: "degradado", failCount: 0 }, true), { status: "degradado", failCount: 0 }, "el sondeo no borra un «con fallas» declarado");
});

test("alertas: una sola por caída y una al volver", () => {
  assert.equal(alertaPorCambio(null, "caido"), "caido");
  assert.equal(alertaPorCambio("caido", "caido"), null);
  assert.equal(alertaPorCambio("caido", "ok"), "recuperado");
  assert.equal(alertaPorCambio(null, "ok"), null);
  assert.equal(alertaPorCambio(null, "degradado"), "degradado");
  assert.equal(alertaPorCambio("degradado", "ok"), "recuperado");
  assert.equal(alertaPorCambio("caido", "sin_senal"), null);
});

test("huella: mismo problema con otros ids o números = misma huella", () => {
  const a = huellaDeError("Factura 1234 no encontrada (id 3f2b8c1e-1111-2222-3333-444455556666)", "api/facturas");
  const b = huellaDeError("Factura 98 no encontrada (id 0a0b0c0d-aaaa-bbbb-cccc-ddddeeeeffff)", "api/facturas");
  assert.equal(a, b);
  assert.notEqual(a, huellaDeError("Factura 98 no encontrada", "api/pagos"));
  assert.equal(a.length, 24);
});

test("niveles y keys", () => {
  assert.equal(nivelDe("fatal"), "grave");
  assert.equal(nivelDe("warning"), "aviso");
  assert.equal(nivelDe(undefined), "error");
  assert.equal(keyDesdeNombre("Clínica Ñandú — Citas", "x1y2"), "clinica-nandu-citas-x1y2");
  assert.equal(keyDesdeNombre("***", "x1y2"), "sistema-x1y2");
});
