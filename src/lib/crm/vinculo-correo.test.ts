import { test } from "node:test";
import assert from "node:assert/strict";
import { contrapartes, decidir, dominiosPropios, esBuzonAutomatico, idsReferidos, nombreDelRemitente } from "./vinculo-correo";
import { leerSolicitud } from "../mail/ai-analyze";

const propias = { direcciones: new Set(["info@pimepanama.com", "javier@pimepanama.com", "pime.panama@gmail.com"]), dominios: dominiosPropios(["info@pimepanama.com", "pime.panama@gmail.com"]) };

test("los dominios propios no incluyen el correo gratuito", () => {
  assert.deepEqual([...propias.dominios], ["pimepanama.com"]);
});

test("contraparte: en lo recibido, quien escribe; en lo enviado, para y copia sin el equipo", () => {
  assert.deepEqual(contrapartes({ folder: "INBOX", fromEmail: "Ana@Acme.com", toAddresses: ["info@pimepanama.com"], ccAddresses: [] }, propias), ["ana@acme.com"]);
  assert.deepEqual(
    contrapartes({ folder: "SENT", fromEmail: "javier@pimepanama.com", toAddresses: ["Ana <ana@acme.com>", "soporte@pimepanama.com"], ccAddresses: ["luis@acme.com", "ana@acme.com"] }, propias),
    ["ana@acme.com", "luis@acme.com"],
  );
  assert.deepEqual(contrapartes({ folder: "INBOX", fromEmail: "soporte@pimepanama.com", toAddresses: ["javier@pimepanama.com"], ccAddresses: [] }, propias), [], "entre el equipo no hay contraparte");
});

test("buzones automáticos", () => {
  assert.ok(esBuzonAutomatico("no-reply@banco.com"));
  assert.ok(esBuzonAutomatico("Notifications <notifications@github.com>"));
  assert.ok(esBuzonAutomatico("emir@substack.com"));
  assert.ok(!esBuzonAutomatico("ana@acme.com"));
  assert.ok(!esBuzonAutomatico("noelia@acme.com"), "un nombre que empieza con «no» no es automático");
});

test("decidir: el cliente gana, luego el lead, luego el hilo; crear solo si se puede", () => {
  assert.deepEqual(decidir({ clientId: "c1", lead: { id: "l1", convertedClientId: "c1" }, hilo: null }, true), { tipo: "ligar", clientId: "c1", leadId: "l1", por: "cliente" });
  assert.deepEqual(decidir({ clientId: "c1", lead: { id: "l1", convertedClientId: null }, hilo: null }, true), { tipo: "ligar", clientId: "c1", leadId: null, por: "cliente" });
  assert.deepEqual(decidir({ clientId: null, lead: { id: "l1", convertedClientId: "c9" }, hilo: null }, true), { tipo: "ligar", leadId: "l1", clientId: "c9", por: "lead" });
  assert.deepEqual(decidir({ clientId: null, lead: null, hilo: { leadId: "l2", clientId: null } }, true), { tipo: "ligar", leadId: "l2", clientId: null, por: "hilo" });
  assert.deepEqual(decidir({ clientId: null, lead: null, hilo: null }, true), { tipo: "crear-lead" });
  assert.deepEqual(decidir({ clientId: null, lead: null, hilo: null }, false), { tipo: "nada" });
});

test("ids referidos sin repetir", () => {
  assert.deepEqual(idsReferidos({ inReplyTo: "<b@x>", referencesHeader: "<a@x> <b@x>" }), ["<b@x>", "<a@x>"]);
  assert.deepEqual(idsReferidos({ inReplyTo: null, referencesHeader: null }), []);
});

test("nombre del lead: IA, remitente o la dirección", () => {
  assert.equal(nombreDelRemitente("María Pérez", "mperez", "m@acme.com"), "María Pérez");
  assert.equal(nombreDelRemitente(null, '"Luis Gómez"', "lg@acme.com"), "Luis Gómez");
  assert.equal(nombreDelRemitente(null, "lg@acme.com", "luis.gomez@acme.com"), "Luis Gomez");
});

test("leerSolicitud valida lo que devuelve la IA", () => {
  assert.equal(leerSolicitud({ es: false }), null);
  assert.equal(leerSolicitud({ es: true, necesidad: "" }), null);
  assert.equal(leerSolicitud("x"), null);
  assert.deepEqual(leerSolicitud({ es: true, nombre: " Ana ", necesidad: "Tienda en línea", valorEstimado: 4999.6, prioridad: "SUPER" }), {
    nombre: "Ana", empresa: null, telefono: null, necesidad: "Tienda en línea", valorEstimado: 5000, prioridad: "MEDIA",
  });
});

test("el detalle de un correo enviado en HTML se lee como texto", async () => {
  const { textoDeCorreo } = await import("./historia");
  assert.equal(textoDeCorreo('<html><head><style>p{color:red}</style></head><div style="font-family: Manrope">Hola&nbsp;Myron,<br>te envío la propuesta</div>'), "Hola Myron, te envío la propuesta");
  assert.equal(textoDeCorreo('texto cortado <div style="font-fam'), "texto cortado");
});
