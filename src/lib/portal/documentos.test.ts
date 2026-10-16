import { test } from "node:test";
import assert from "node:assert/strict";
import { archivoValido, contratoVisible, esperaMiFirma, estadoContrato, estadoPropuesta, lineasDePropuesta, llaveDeArchivos, minutaParaCliente, nombreQueAcepta, propuestaVisible, puedeAceptarPropuesta, tamanoLegible, MAX_ARCHIVO } from "./documentos";

test("el cliente solo ve propuestas enviadas o aceptadas, nunca borradores", () => {
  assert.equal(propuestaVisible("SENT"), true);
  assert.equal(propuestaVisible("ACCEPTED"), true);
  for (const s of ["DRAFT", "REJECTED", "CANCELLED", "PAID"]) assert.equal(propuestaVisible(s), false, s);
});

test("solo la persona principal acepta, y solo lo que espera respuesta", () => {
  assert.deepEqual(puedeAceptarPropuesta({ status: "SENT" }, "principal"), { ok: true });
  assert.equal(puedeAceptarPropuesta({ status: "SENT" }, "miembro").ok, false);
  assert.equal(puedeAceptarPropuesta({ status: "ACCEPTED" }, "principal").ok, false);
  assert.equal(puedeAceptarPropuesta({ status: "DRAFT" }, "principal").ok, false);
});

test("una propuesta vale todo el día de su vencimiento (hora de Panamá)", () => {
  const vence = new Date("2026-10-20T12:00:00.000Z");
  assert.equal(puedeAceptarPropuesta({ status: "SENT", validUntil: vence }, "principal", new Date("2026-10-21T04:30:00.000Z")).ok, true, "23:30 del 20 en Panamá");
  assert.equal(puedeAceptarPropuesta({ status: "SENT", validUntil: vence }, "principal", new Date("2026-10-21T05:30:00.000Z")).ok, false, "00:30 del 21 en Panamá");
  assert.equal(estadoPropuesta({ status: "SENT", validUntil: vence }, new Date("2026-11-01T00:00:00Z")).texto, "Vencida");
  assert.equal(estadoPropuesta({ status: "ACCEPTED", validUntil: vence }, new Date("2026-11-01T00:00:00Z")).texto, "Aceptada");
});

test("quien acepta queda con su nombre, o su correo si no tiene", () => {
  assert.equal(nombreQueAcepta({ fullName: "  Ana Pérez ", email: "ana@x.com" }), "Ana Pérez");
  assert.equal(nombreQueAcepta({ fullName: null, email: "ana@x.com" }), "ana@x.com");
});

test("las líneas de la propuesta hacen la misma cuenta que el PDF", () => {
  const l = lineasDePropuesta({ lineItems: [{ description: "Sitio", quantity: 2, unitPrice: 100, discount: 10, taxPercent: 7 }, { description: "" }, null, { foo: 1 }] });
  assert.equal(l.length, 1);
  assert.equal(Math.round(l[0].total * 100) / 100, 192.6);
  assert.deepEqual(lineasDePropuesta(null), []);
});

test("contratos: los borradores internos no salen; el estado se lee en palabras del cliente", () => {
  assert.equal(contratoVisible({ status: "DRAFT", signingStatus: null }), false);
  assert.equal(contratoVisible({ status: "DRAFT", signingStatus: "PENDING_CLIENT" }), true);
  assert.equal(contratoVisible({ status: "ACTIVE" }), true);
  assert.equal(estadoContrato({ status: "DRAFT", signingStatus: "PENDING_CLIENT" }).texto, "Espera tu firma");
  assert.equal(estadoContrato({ status: "ACTIVE", signingStatus: "COMPLETED" }).tono, "ok");
});

test("la firma espera solo a la persona a quien se le mandó", () => {
  const c = { status: "DRAFT", signingStatus: "PENDING_CLIENT", clientEmail: "Ana@X.com " };
  assert.equal(esperaMiFirma(c, "ana@x.com"), true);
  assert.equal(esperaMiFirma(c, "otro@x.com"), false);
  assert.equal(esperaMiFirma({ ...c, signingStatus: "PENDING_COMPANY" }, "ana@x.com"), false);
});

test("la minuta del cliente es solo la ejecutiva y descarta lo vacío", () => {
  assert.equal(minutaParaCliente(null), null);
  assert.equal(minutaParaCliente({ agenda: " ", decisions: [] }), null);
  const m = minutaParaCliente({ agenda: "Se revisó el avance", decisions: ["Lanzar el lunes", 3, ""], nextMeeting: "Por agendar", summary: "técnico" });
  assert.ok(m);
  assert.deepEqual(m.decisiones, ["Lanzar el lunes"]);
  assert.equal("summary" in m, false);
});

test("archivos: hasta 20 MB, nada ejecutable, y solo de la carpeta del cliente", () => {
  assert.equal(archivoValido({ nombre: "plano.pdf", tamano: 1000 }), null);
  assert.ok(archivoValido({ nombre: "plano.pdf", tamano: MAX_ARCHIVO + 1 }));
  assert.ok(archivoValido({ nombre: "virus.exe", tamano: 10 }));
  assert.ok(archivoValido({ nombre: "a.pdf", tamano: 0 }));
  assert.equal(llaveDeArchivos("c1", "archivos/c1/2026-10/x.pdf"), true);
  assert.equal(llaveDeArchivos("c1", "archivos/c2/2026-10/x.pdf"), false);
  assert.equal(llaveDeArchivos("c1", "archivos/c1/../c2/x.pdf"), false);
  assert.equal(tamanoLegible(2.5 * 1024 * 1024), "2.5 MB");
  assert.equal(tamanoLegible(null), "—");
});
