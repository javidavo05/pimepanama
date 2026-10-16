import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ETAPAS_INICIALES, cierreVencido, elegirClientePorCorreo, etiquetaFuente, fasesDesdeLineas, moverEtapa, ordenarEtapas,
  probabilidadValida, pronosticoPonderado, resumenEmbudo, totalesPorEtapa,
} from "./embudo";

const etapas = [
  { id: "perd", nombre: "Perdido", orden: 5, probabilidad: 0, tipo: "perdida" },
  { id: "neg", nombre: "Negociación", orden: 3, probabilidad: 70, tipo: "abierta" },
  { id: "gan", nombre: "Ganado", orden: 0, probabilidad: 100, tipo: "ganada" },
  { id: "nuevo", nombre: "Nuevo", orden: 0, probabilidad: 10, tipo: "abierta" },
  { id: "cot", nombre: "Cotizando", orden: 2, probabilidad: 40, tipo: "abierta" },
];

test("las etapas iniciales son las de los leads, con su probabilidad", () => {
  assert.deepEqual(ETAPAS_INICIALES.map((e) => `${e.nombre}:${e.probabilidad}:${e.tipo}`), [
    "Nuevo:10:abierta", "Contactado:20:abierta", "Cotizando:40:abierta", "Negociación:70:abierta", "Ganado:100:ganada", "Perdido:0:perdida",
  ]);
});

test("orden de etapas: abiertas por orden, después Ganado y Perdido", () => {
  assert.deepEqual(ordenarEtapas(etapas).map((e) => e.id), ["nuevo", "cot", "neg", "gan", "perd"]);
});

test("subir y bajar solo mueve entre las abiertas", () => {
  assert.deepEqual(moverEtapa(etapas, "cot", "subir"), [{ id: "cot", orden: 0 }, { id: "nuevo", orden: 1 }, { id: "neg", orden: 2 }]);
  assert.equal(moverEtapa(etapas, "nuevo", "subir"), null, "ya es la primera");
  assert.equal(moverEtapa(etapas, "neg", "bajar"), null, "no baja por debajo de Ganado");
  assert.equal(moverEtapa(etapas, "gan", "subir"), null, "las finales no se mueven");
});

test("pronóstico ponderado: valor × probabilidad, solo abiertas", () => {
  const ops = [
    { valor: 1000, probabilidad: 10, estado: "abierta" },
    { valor: 2500, probabilidad: 70, estado: "abierta" },
    { valor: 9999, probabilidad: 100, estado: "ganada" },
    { valor: 500, probabilidad: 0, estado: "perdida" },
  ];
  assert.equal(pronosticoPonderado(ops), 1850);
  assert.equal(pronosticoPonderado([]), 0);
  assert.equal(pronosticoPonderado([{ valor: 100, probabilidad: 250, estado: "abierta" }]), 100, "la probabilidad se topa en 100");
});

test("totales por etapa, con etapas vacías en cero", () => {
  const ops = [
    { id: "1", etapaId: "nuevo", valor: 100, probabilidad: 10, estado: "abierta" },
    { id: "2", etapaId: "nuevo", valor: 300.5, probabilidad: 10, estado: "abierta" },
    { id: "3", etapaId: "neg", valor: 1000, probabilidad: 70, estado: "abierta" },
  ];
  const t = totalesPorEtapa(etapas, ops);
  assert.deepEqual(t.nuevo, { etapaId: "nuevo", cantidad: 2, valor: 400.5, ponderado: 40.05 });
  assert.deepEqual(t.neg, { etapaId: "neg", cantidad: 1, valor: 1000, ponderado: 700 });
  assert.deepEqual(t.cot, { etapaId: "cot", cantidad: 0, valor: 0, ponderado: 0 });
});

test("resumen: abierto, ponderado y cerrado este mes", () => {
  const hoy = new Date("2026-10-16T15:00:00Z");
  const r = resumenEmbudo([
    { id: "1", etapaId: "nuevo", valor: 1000, probabilidad: 50, estado: "abierta" },
    { id: "2", etapaId: "gan", valor: 800, probabilidad: 100, estado: "ganada", cerradaAt: "2026-10-02T12:00:00Z" },
    { id: "3", etapaId: "gan", valor: 700, probabilidad: 100, estado: "ganada", cerradaAt: "2026-09-30T12:00:00Z" },
  ], hoy);
  assert.deepEqual(r, { totalAbierto: 1000, abiertas: 1, ponderado: 500, cerradoMes: 800, ganadasMes: 1 });
});

test("cierre vencido solo si ya pasó y sigue abierta", () => {
  const hoy = new Date("2026-10-16T15:00:00Z");
  assert.equal(cierreVencido("2026-10-15T12:00:00Z", "abierta", hoy), true);
  assert.equal(cierreVencido("2026-10-16T12:00:00Z", "abierta", hoy), false, "hoy todavía no venció");
  assert.equal(cierreVencido("2026-10-15T12:00:00Z", "ganada", hoy), false);
  assert.equal(cierreVencido(null, "abierta", hoy), false);
});

test("elegir cliente existente por correo, sin importar mayúsculas", () => {
  const clientes = [
    { id: "a", email: "Ana@Empresa.com ", archivedAt: "2026-01-01", createdAt: "2025-01-01" },
    { id: "b", email: "ana@empresa.com", archivedAt: null, createdAt: "2026-05-01" },
    { id: "c", email: "ana@empresa.com", archivedAt: null, createdAt: "2026-02-01" },
    { id: "d", email: null, archivedAt: null, createdAt: "2026-02-01" },
  ];
  assert.equal(elegirClientePorCorreo(clientes, "  ANA@empresa.COM")?.id, "c", "el más antiguo sin archivar");
  assert.equal(elegirClientePorCorreo(clientes, "otro@x.com"), null);
  assert.equal(elegirClientePorCorreo(clientes, ""), null, "sin correo no adivina");
  assert.equal(elegirClientePorCorreo(clientes, null), null);
});

test("líneas de cotización como fases", () => {
  assert.deepEqual(fasesDesdeLineas([
    { description: "Diseño\ncon detalle", quantity: 1, unitPrice: 1200, discount: 0 },
    { description: "Hosting", quantity: "12", unitPrice: "10", discount: "50" },
    { description: "  ", quantity: 1, unitPrice: 5 },
  ]), [{ name: "Diseño", price: 1200 }, { name: "Hosting", price: 60 }]);
  assert.deepEqual(fasesDesdeLineas(undefined), []);
});

test("probabilidad y fuente", () => {
  assert.equal(probabilidadValida("45.6"), 46);
  assert.equal(probabilidadValida(-3), 0);
  assert.equal(probabilidadValida("x", 20), 20);
  assert.equal(etiquetaFuente("REDES_SOCIALES"), "Redes sociales");
  assert.equal(etiquetaFuente("Instagram"), "Instagram");
  assert.equal(etiquetaFuente(null), null);
});
