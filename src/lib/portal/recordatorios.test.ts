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
