import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deActividad, deCorreo, deInteraccion, deTicket, deCotizacion, filtrarEventos, fusionarEventos, paginar, pide, tiposValidos,
  type EventoHistoria,
} from "./historia";
import { claveDeCampo, limpiarEtiquetas, numeroWhatsapp, valorDeCampo } from "./ficha";

const ev = (id: string, fecha: string, tipo: EventoHistoria["tipo"] = "actividad", clave?: string): EventoHistoria => ({ id, tipo, fecha, titulo: id, clave });

test("fusiona varias fuentes de la más nueva a la más vieja", () => {
  const r = fusionarEventos(
    [ev("a:1", "2026-10-01T10:00:00.000Z"), ev("a:2", "2026-10-03T10:00:00.000Z")],
    [ev("b:1", "2026-10-02T10:00:00.000Z", "correo")],
  );
  assert.deepEqual(r.map((e) => e.id), ["a:2", "b:1", "a:1"]);
});

test("a igual fecha el orden es estable por id", () => {
  const f = "2026-10-01T10:00:00.000Z";
  assert.deepEqual(fusionarEventos([ev("z:1", f), ev("c:1", f)], [ev("m:1", f)]).map((e) => e.id), ["c:1", "m:1", "z:1"]);
});

test("quita repetidos por id y se queda con la fuente propia antes que la actividad genérica", () => {
  const actividad = deActividad({ id: "e1", title: "Abrimos el ticket TK-0001", detail: null, createdAt: "2026-10-05T10:00:00.000Z", kind: "ticket_abierto", entityType: "ticket", entityId: "t1", actorType: "pime", visibility: "cliente" });
  const ticket = deTicket({ id: "t1", number: "TK-0001", title: "Se cayó la web", status: "abierto", createdAt: "2026-10-05T09:59:59.000Z", source: "empresa" });
  const r = fusionarEventos([actividad, actividad], [ticket]);
  assert.equal(r.length, 1);
  assert.equal(r[0].tipo, "ticket");
  assert.equal(r[0].enlace, "/empresa/tickets/t1");
});

test("la actividad que no repite nada se conserva", () => {
  const a = deActividad({ id: "e2", title: "Pago confirmado", detail: "$100", createdAt: "2026-10-05T10:00:00.000Z", kind: "pago_confirmado", entityType: "pago", entityId: "p1", actorType: "pime", visibility: "interno" });
  const t = deTicket({ id: "t1", number: "TK-1", title: "x", status: "abierto", createdAt: "2026-10-01T00:00:00.000Z", source: "portal" });
  assert.equal(fusionarEventos([a], [t]).length, 2);
});

test("filtra por tipo; sin tipos muestra todo", () => {
  const todos = [ev("a", "2026-10-03T00:00:00.000Z", "correo"), ev("b", "2026-10-02T00:00:00.000Z", "nota"), ev("c", "2026-10-01T00:00:00.000Z", "ticket")];
  assert.deepEqual(filtrarEventos(todos, ["nota", "ticket"]).map((e) => e.id), ["b", "c"]);
  assert.equal(filtrarEventos(todos, []).length, 3);
});

test("tipos de la URL: solo los conocidos", () => {
  assert.deepEqual(tiposValidos(["correo", "hackeo", "nota"]), ["correo", "nota"]);
  assert.deepEqual(tiposValidos(null), []);
});

test("pide: qué fuentes se consultan según el filtro", () => {
  assert.equal(pide([], "correo"), true);
  assert.equal(pide(["nota"], "correo"), false);
  assert.equal(pide(["nota"], "conversacion", "nota"), true);
});

test("paginar: corta, avisa si hay más y deja el cursor en la fecha del último", () => {
  const lista = Array.from({ length: 5 }, (_, i) => ev(`x:${i}`, `2026-10-0${9 - i}T00:00:00.000Z`));
  const p = paginar(lista, 3);
  assert.equal(p.eventos.length, 3);
  assert.equal(p.hayMas, true);
  assert.equal(p.cursor, "2026-10-07T00:00:00.000Z");
  const ultima = paginar(lista.slice(3), 3);
  assert.equal(ultima.hayMas, false);
  assert.equal(ultima.cursor, null);
});

test("interacción: título con dirección y contacto, nota aparte, fijada se conserva", () => {
  const base = { id: "i1", direccion: "saliente", resumen: "Le expliqué la propuesta", resultado: "Interesado", duracionMin: 12, proximoPaso: "Enviar cotización", fijada: true, ocurrioAt: new Date("2026-10-10T15:00:00.000Z"), contacto: { nombre: "Ana" }, autor: { fullName: "Javier", email: "j@x.com" } };
  const l = deInteraccion({ ...base, tipo: "llamada" });
  assert.equal(l.tipo, "conversacion");
  assert.equal(l.titulo, "Llamada saliente con Ana");
  assert.match(l.detalle ?? "", /12 min/);
  assert.equal(l.fijada, true);
  assert.equal(l.refId, "i1");
  const n = deInteraccion({ ...base, tipo: "nota", direccion: null });
  assert.equal(n.tipo, "nota");
  assert.equal(n.titulo, "Nota");
});

test("correo: enviado o recibido, con enlace al correo", () => {
  const r = deCorreo({ id: "m1", subject: "Propuesta", fromEmail: "ana@cliente.com", fromName: "Ana", receivedAt: "2026-10-10T00:00:00.000Z", folder: "INBOX", aiSummary: null, bodyText: "Hola,\n\n  gracias" });
  assert.equal(r.titulo, "Correo de Ana: Propuesta");
  assert.equal(r.detalle, "Hola, gracias");
  assert.equal(r.enlace, "/empresa/correos/hub/m1");
  assert.equal(deCorreo({ id: "m2", subject: null, fromEmail: "yo@pime.com", fromName: null, receivedAt: "2026-10-10T00:00:00.000Z", folder: "SENT", aiSummary: "Resumen", bodyText: null }).titulo, "Correo enviado: (sin asunto)");
});

test("cotización aceptada lo dice", () => {
  const q = deCotizacion({ id: "q1", number: "COT-7", title: "Web", status: "SENT", issueDate: "2026-10-01T00:00:00.000Z", total: 500, aceptadaAt: "2026-10-02T00:00:00.000Z" }, (n) => `$${n}`);
  assert.equal(q.detalle, "$500 · aceptada por el cliente");
});

test("WhatsApp: solo dígitos y 507 a los números locales", () => {
  assert.equal(numeroWhatsapp("6123-4567"), "50761234567");
  assert.equal(numeroWhatsapp("+507 6123 4567"), "50761234567");
  assert.equal(numeroWhatsapp("+1 (305) 555-1234"), "13055551234");
  assert.equal(numeroWhatsapp("abc"), null);
  assert.equal(numeroWhatsapp(null), null);
});

test("etiquetas sin repetidas ni vacías", () => {
  assert.deepEqual(limpiarEtiquetas([" VIP ", "vip", "", "Gobierno  central"]), ["VIP", "Gobierno central"]);
});

test("clave y valor de un campo propio", () => {
  assert.equal(claveDeCampo("Fecha de aniversario"), "fecha_de_aniversario");
  assert.equal(claveDeCampo("Número de sucursales"), "numero_de_sucursales");
  assert.equal(valorDeCampo("numero", [], "1,200"), 1200);
  assert.equal(valorDeCampo("numero", [], "mucho"), null);
  assert.equal(valorDeCampo("fecha", [], "2026-10-16"), "2026-10-16");
  assert.equal(valorDeCampo("opcion", ["A", "B"], "C"), null);
  assert.equal(valorDeCampo("texto", [], "  "), null);
});
