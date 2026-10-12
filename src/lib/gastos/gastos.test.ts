import { test } from "node:test";
import assert from "node:assert/strict";
import { totalesGastos, type GastoMin } from "./totales";
import { sugerirGasto } from "./sugerir";

const g = (p: Partial<GastoMin>): GastoMin => ({ title: "Gasto", vendor: null, amount: 10, status: "PAID", isRecurring: false, paidAt: null, dueDate: null, createdAt: new Date("2026-01-01T12:00:00Z"), ...p });
const AHORA = new Date("2026-10-12T15:00:00Z");

test("gastos: sin gastos todo es cero", () => {
  assert.deepEqual(totalesGastos([], AHORA), { mes: 0, anio: 0, recurrenteMensual: 0, cantidad: 0, pendiente: 0 });
});

test("gastos: mes y año por la fecha de pago, vencimiento o registro; cancelados fuera", () => {
  const c = totalesGastos([
    g({ amount: 20, paidAt: new Date("2026-10-03T12:00:00Z") }),
    g({ amount: 5, status: "PENDING", dueDate: new Date("2026-10-30T12:00:00Z") }),
    g({ amount: 100, paidAt: new Date("2026-03-01T12:00:00Z") }),
    g({ amount: 999, paidAt: new Date("2025-10-05T12:00:00Z") }),
    g({ amount: 50, status: "CANCELLED", paidAt: new Date("2026-10-04T12:00:00Z") }),
  ], AHORA);
  assert.equal(c.mes, 25);
  assert.equal(c.anio, 125);
  assert.equal(c.pendiente, 5);
  assert.equal(c.cantidad, 4);
});

test("gastos: el mes va en hora de Panamá (1 de nov 03:00 UTC es todavía octubre)", () => {
  const c = totalesGastos([g({ amount: 7, paidAt: new Date("2026-11-01T03:00:00Z") })], new Date("2026-10-31T20:00:00Z"));
  assert.equal(c.mes, 7);
});

test("gastos: recurrente mensual cuenta cada serie una vez, con su monto más reciente", () => {
  const c = totalesGastos([
    g({ title: "Vercel Pro", vendor: "Vercel", amount: 20, isRecurring: true, paidAt: new Date("2026-08-01T12:00:00Z") }),
    g({ title: "vercel pro ", vendor: "Vercel", amount: 25, isRecurring: true, paidAt: new Date("2026-09-01T12:00:00Z") }),
    g({ title: "Supabase", vendor: "Supabase", amount: 25, isRecurring: true, paidAt: new Date("2026-09-02T12:00:00Z") }),
    g({ title: "Dominio", amount: 12, isRecurring: false, paidAt: new Date("2026-09-02T12:00:00Z") }),
  ], AHORA);
  assert.equal(c.recurrenteMensual, 50);
});

test("sugerir gasto: Vercel y Supabase son hosting con su proveedor", () => {
  assert.deepEqual(sugerirGasto("Vercel Pro"), { category: "HOSTING", vendor: "Vercel" });
  assert.deepEqual(sugerirGasto("plan supabase"), { category: "HOSTING", vendor: "Supabase" });
  assert.deepEqual(sugerirGasto("Dominio academyxcrm.com"), { category: "HOSTING", vendor: null });
  assert.deepEqual(sugerirGasto("Claude Max"), { category: "SAAS", vendor: "Anthropic" });
  assert.equal(sugerirGasto("Almuerzo con el equipo"), null);
  assert.equal(sugerirGasto(""), null);
});
