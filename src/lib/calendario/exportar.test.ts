import { test } from "node:test";
import assert from "node:assert/strict";
import { armarIcs } from "./exportar";
import { eventosEntre } from "./ics";

  const eventos = [
    { uid: "cita-1", titulo: "Llamada inicial · María José Núñez, S.A.; cliente", inicio: new Date("2026-10-20T15:00:00Z"), fin: new Date("2026-10-20T15:30:00Z"), todoElDia: false, descripcion: "maria@x.com\n+507 6000-0000" },
    // 23:30 en Panamá es el día siguiente en UTC: el de todo el día tiene que quedar el 20 en Panamá.
    { uid: "factura-1", titulo: "Cobrar F-0012 · Cliente con un nombre larguísimo que obliga a plegar la línea del calendario", inicio: new Date("2026-10-21T04:30:00Z"), fin: null, todoElDia: true },
  ];
  const ics = armarIcs(eventos, new Date("2026-10-12T12:00:00Z"));

test("armarIcs: usa CRLF y pliega a 75 octetos", () => {
    assert.ok(ics.includes("\r\n"));
    for (const l of ics.split("\r\n")) assert.ok(Buffer.byteLength(l) <= 75, l);
  });

test("armarIcs: escapa comas, punto y coma y saltos", () => {
    assert.ok(ics.includes("S.A.\; cliente"));
    assert.ok(ics.includes("maria@x.com\\n+507"));
  });

test("armarIcs: los de todo el día van en fecha de Panamá", () => {
    assert.ok(ics.includes("DTSTART;VALUE=DATE:20261020"));
    assert.ok(ics.includes("DTEND;VALUE=DATE:20261021"));
  });

test("armarIcs: lo lee de vuelta un lector iCal", () => {
    const leidos = eventosEntre(ics, new Date("2026-10-19T00:00:00Z"), new Date("2026-10-23T00:00:00Z"));
    assert.equal(leidos.length, 2);
    assert.equal(leidos.find((e) => e.id.startsWith("cita-1"))?.titulo, "Llamada inicial · María José Núñez, S.A.; cliente");
  });
