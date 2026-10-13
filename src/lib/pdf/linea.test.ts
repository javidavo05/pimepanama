import { test } from "node:test";
import assert from "node:assert/strict";
import { lineaDe, lineaDeClientes, temaDe, mezclar, TEMAS } from "./linea";

test("la línea sale del cliente: premium solo si el cliente es premium", () => {
  assert.equal(lineaDe({ brandLine: "premium" }), "premium");
  assert.equal(lineaDe({ brandLine: "normal" }), "normal");
  // Sin cliente, sin línea o con un valor desconocido: normal.
  assert.equal(lineaDe(null), "normal");
  assert.equal(lineaDe(undefined), "normal");
  assert.equal(lineaDe({ brandLine: null }), "normal");
  assert.equal(lineaDe({ brandLine: "Premium" }), "normal");
});

test("un proyecto con varios clientes es premium si uno lo es", () => {
  assert.equal(lineaDeClientes([{ brandLine: "normal" }, { brandLine: "premium" }]), "premium");
  assert.equal(lineaDeClientes([{ brandLine: "normal" }, null]), "normal");
  assert.equal(lineaDeClientes([]), "normal");
});

test("cada línea usa su paleta y su logo, sin mezclarse", () => {
  const n = temaDe("normal");
  const p = temaDe("premium");
  assert.equal(n.accent, "#1F5BFF");
  assert.equal(n.dark, "#0B1D3A");
  assert.equal(p.accent, "#B8892E");
  assert.equal(p.accentText, "#8A6420");
  assert.equal(p.dark, "#0A0A0A");
  assert.match(n.logoColor, /^pime-normal-/);
  assert.match(p.logoColor, /^pime-premium-/);
  assert.match(p.logoInvertido, /^pime-premium-/);
  // Ningún color del azul en premium ni del oro en normal.
  const azules = new Set(Object.values(TEMAS.normal).filter((v) => typeof v === "string" && v.startsWith("#") && v !== "#FFFFFF"));
  for (const v of Object.values(TEMAS.premium)) if (typeof v === "string") assert.ok(!azules.has(v), `premium usa ${v} de normal`);
  assert.equal(temaDe(undefined).linea, "normal");
});

test("mezclar da el sólido de un rgba sobre su fondo", () => {
  assert.equal(mezclar("#FFFFFF", "#000000", 0.5), "#808080");
  assert.equal(mezclar("#FFFFFF", "#0A0A0A", 0), "#0A0A0A");
});
