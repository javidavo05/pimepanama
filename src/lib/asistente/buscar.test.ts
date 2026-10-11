import { test } from "node:test";
import assert from "node:assert/strict";
import { mejores, puntaje } from "./buscar";

const clientes = [
  { n: "HOLO REAL ESTATE & RELOCATION, S.A.", c: "JUAN CAMILO, MURIEL" },
  { n: "B&B Real Estate S.A", c: "" },
  { n: "Union Adventista del Septimo día", c: "" },
  { n: "Ministerio Mundial de Sembradores", c: "" },
];

test("encuentra clientes por nombre aproximado", () => {
  assert.equal(mejores("Holo Realtor", clientes, (x) => [x.n, x.c])[0].item.n, "HOLO REAL ESTATE & RELOCATION, S.A.");
  assert.equal(mejores("holo", clientes, (x) => [x.n])[0].item.n, "HOLO REAL ESTATE & RELOCATION, S.A.");
  assert.equal(mejores("la unión adventista", clientes, (x) => [x.n])[0].item.n, "Union Adventista del Septimo día");
  assert.equal(mejores("sembradores", clientes, (x) => [x.n])[0].item.n, "Ministerio Mundial de Sembradores");
  assert.equal(mejores("B&B", clientes, (x) => [x.n])[0].item.n, "B&B Real Estate S.A");
  assert.equal(mejores("Muriel", clientes, (x) => [x.n, x.c])[0].item.n, "HOLO REAL ESTATE & RELOCATION, S.A.");
});

test("no inventa coincidencias", () => {
  assert.equal(mejores("Coca Cola", clientes, (x) => [x.n]).length, 0);
  assert.equal(puntaje("", "HOLO"), 0);
});
