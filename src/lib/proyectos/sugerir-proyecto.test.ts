import { test } from "node:test";
import assert from "node:assert/strict";
import { sugerirProyecto, type ProyectoCandidato } from "./sugerir-proyecto";

const proyectos: ProyectoCandidato[] = [
  { id: "holo", name: "HOLO REALTY", clientIds: ["c-holo"], clientNames: ["HOLO REAL ESTATE & RELOCATION, S.A."] },
  { id: "bb", name: "Pagina web B&B", clientIds: ["c-bb"], clientNames: ["B&B Real Estate S.A"] },
  { id: "union", name: "Sistema de Gestión Secretarial", clientIds: ["c-union"], clientNames: ["Union Adventista del Septimo día"] },
  { id: "bb2", name: "Portal de inquilinos", clientIds: ["c-bb"], clientNames: ["B&B Real Estate S.A"] },
];

test("sugerir: el título nombra el proyecto → inequívoca", () => {
  assert.deepEqual(sugerirProyecto({ title: "meet holo", clientId: null }, proyectos), { projectId: "holo", motivo: "titulo", inequivoca: true });
});

test("sugerir: el título nombra al cliente del proyecto", () => {
  assert.deepEqual(sugerirProyecto({ title: "union", clientId: null }, proyectos), { projectId: "union", motivo: "titulo", inequivoca: true });
});

test("sugerir: cliente con un solo proyecto → inequívoca por cliente", () => {
  assert.deepEqual(sugerirProyecto({ title: "Revisión", clientId: "c-holo" }, proyectos), { projectId: "holo", motivo: "cliente", inequivoca: true });
});

test("sugerir: cliente con dos proyectos y título que no decide → nada", () => {
  assert.equal(sugerirProyecto({ title: "Revisión semanal", clientId: "c-bb" }, proyectos), null);
});

test("sugerir: cliente con dos proyectos y el título decide", () => {
  assert.deepEqual(sugerirProyecto({ title: "Inquilinos: alcance", clientId: "c-bb" }, proyectos), { projectId: "bb2", motivo: "titulo", inequivoca: true });
});

test("sugerir: cliente y título apuntan a proyectos distintos → nada", () => {
  assert.equal(sugerirProyecto({ title: "meet holo", clientId: "c-union" }, proyectos), null);
});

test("sugerir: cliente sin proyectos y título de otro → sugerencia, no inequívoca", () => {
  assert.deepEqual(sugerirProyecto({ title: "meet holo", clientId: "c-anita" }, proyectos), { projectId: "holo", motivo: "titulo", inequivoca: false });
});

test("sugerir: sin pistas en el título, el contexto sugiere sin enlazar solo", () => {
  assert.deepEqual(
    sugerirProyecto({ title: "llamada", clientId: null, manualContext: "Seguimos con lo de Holo y la mudanza" }, proyectos),
    { projectId: "holo", motivo: "contexto", inequivoca: false },
  );
});

test("sugerir: sin ninguna pista → nada", () => {
  assert.equal(sugerirProyecto({ title: "meet anita 16 sep", clientId: "c-anita" }, proyectos), null);
  assert.equal(sugerirProyecto({ title: "test", clientId: null }, proyectos), null);
});
