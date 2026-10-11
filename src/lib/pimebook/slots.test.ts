import { test } from "node:test";
import assert from "node:assert/strict";
import { desfaseZona, horaEnZona, turnosPosibles } from "./slots";

const lunes = [{ weekday: 1, startTime: "09:00", endTime: "17:00", timezone: "America/Panama" }];

test("las 9:00 de Panamá son las 14:00 UTC, en cualquier zona del servidor", () => {
  assert.equal(desfaseZona("America/Panama", new Date("2026-10-12T12:00:00Z")), 300);
  assert.equal(horaEnZona("2026-10-12", 9 * 60, "America/Panama").toISOString(), "2026-10-12T14:00:00.000Z");
});

test("turnos del lunes 12 de octubre, de 30 min con 10 de pausa", () => {
  const t = turnosPosibles(lunes, new Date("2026-10-12T05:00:00Z"), new Date("2026-10-13T05:00:00Z"), 30, 10);
  assert.equal(t[0].startTime.toISOString(), "2026-10-12T14:00:00.000Z");
  assert.equal(t[0].start, "09:00");
  assert.equal(t[1].start, "09:40");
  assert.equal(t[t.length - 1].start, "16:20");
  assert.equal(t.length, 12);
});

test("el día pedido en hora de Nueva York trae los turnos que caen en ese día", () => {
  // Lunes 12 de octubre en Nueva York (EDT, UTC−4): de 04:00Z a 04:00Z del martes.
  const t = turnosPosibles(lunes, new Date("2026-10-12T04:00:00Z"), new Date("2026-10-13T04:00:00Z"), 30, 10);
  assert.equal(t.length, 12);
  assert.equal(t[0].startTime.toISOString(), "2026-10-12T14:00:00.000Z");
});

test("el domingo no hay turnos", () => {
  assert.equal(turnosPosibles(lunes, new Date("2026-10-11T05:00:00Z"), new Date("2026-10-12T05:00:00Z"), 30, 10).length, 0);
});
