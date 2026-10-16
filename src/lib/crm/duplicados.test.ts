import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparDuplicados, datosFusion, enlacesProyecto, nombreClave, nombresParecidos, rucClave } from "./duplicados";

test("nombre normalizado sin tildes, mayúsculas ni S.A.", () => {
  assert.equal(nombreClave("Constructora Pérez, S.A."), "constructora perez");
  assert.equal(nombreClave("CONSTRUCTORA PEREZ SA"), "constructora perez");
  assert.equal(nombreClave("Constructora Pérez S. A."), "constructora perez");
  assert.equal(nombreClave("Grupo Holo Inc."), "holo");
  assert.equal(rucClave("8-123-456 DV 7"), "81234567");
});

test("parecido: una letra de diferencia en nombres largos sí, cortos no", () => {
  assert.ok(nombresParecidos("constructora perez", "constructora peres"));
  assert.ok(!nombresParecidos("holo", "hola"));
  assert.ok(!nombresParecidos("panama digital", "panama dental"));
});

test("agrupa por correo, RUC y nombre, transitivamente", () => {
  const g = agruparDuplicados([
    { id: "a", name: "Juan Pérez", company: "Constructora Pérez S.A.", email: "juan@cp.com", ruc: null, createdAt: "2025-01-01" },
    { id: "b", name: "J. Perez", company: "CONSTRUCTORA PEREZ", email: null, ruc: "155-1-2", createdAt: "2024-01-01" },
    { id: "c", name: "Contabilidad", company: "Otra", email: "x@y.com", ruc: "155-1-2", createdAt: "2026-01-01" },
    { id: "d", name: "María", company: null, email: "JUAN@cp.com ", ruc: null, createdAt: "2026-02-01" },
    { id: "e", name: "Solo", company: "Sin pareja", email: "solo@x.com", ruc: null },
  ]);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].clientes.map((c) => c.id), ["b", "a", "c", "d"], "el más antiguo primero");
  assert.deepEqual(g[0].motivos, ["correo", "ruc", "nombre"]);
});

test("sin duplicados no hay grupos", () => {
  assert.deepEqual(agruparDuplicados([{ id: "a", name: "Ana", company: null, email: null, ruc: null }, { id: "b", name: "Beto", company: null, email: null, ruc: null }]), []);
});

test("la fusión completa lo vacío y nunca pisa lo que hay", () => {
  const { data, completados } = datosFusion(
    { company: "Acme", email: null, phone: "", etiquetas: ["vip"], ultimoContactoAt: new Date("2026-01-01"), camposExtra: { a: 1 } },
    { company: "Otra", email: "o@x.com", phone: "6000", etiquetas: ["vip", "web"], ultimoContactoAt: new Date("2026-05-01"), camposExtra: { a: 2, b: 3 }, portalEnabled: true },
  );
  assert.deepEqual(completados, ["email", "phone"]);
  assert.equal(data.company, undefined);
  assert.deepEqual(data.etiquetas, ["vip", "web"]);
  assert.deepEqual(data.ultimoContactoAt, new Date("2026-05-01"));
  assert.deepEqual(data.camposExtra, { a: 1, b: 3 });
  assert.equal(data.portalEnabled, true);
});

test("proyectos compartidos no se duplican", () => {
  assert.deepEqual(enlacesProyecto(["p1", "p2"], ["p2", "p3"]), { mover: ["p3"], borrar: ["p2"] });
});
