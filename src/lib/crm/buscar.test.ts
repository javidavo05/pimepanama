import { test } from "node:test";
import assert from "node:assert/strict";
import { accesosComunes, agregarReciente, agrupar, aplanar, buscarPantallas, moverIndice, normalizar, numeroBuscado, puntaje, type Resultado } from "./buscar";

test("normalizar quita tildes, mayúsculas y espacios de más", () => {
  assert.equal(normalizar("  Panamá   CÓDIGO  "), "panama codigo");
  assert.equal(normalizar(null), "");
});

test("puntaje: tolerante a tildes y todas las palabras deben estar", () => {
  assert.ok(puntaje("jose", "José Pérez") > 0);
  assert.ok(puntaje("PEREZ jose", "José Pérez") > 0);
  assert.equal(puntaje("jose maria", "José Pérez"), 0);
  assert.ok(puntaje("acme", "Acme") > puntaje("acme", "Grupo Acme"), "igual gana a contiene");
  assert.ok(puntaje("gru", "Grupo Acme") > puntaje("cme", "Grupo Acme"), "empieza gana a contiene");
  assert.equal(puntaje("", "Algo"), 0);
});

test("pantallas por sinónimo y respetando el área", () => {
  const p = buscarPantallas("presupuesto", "ventas");
  assert.ok(p.some((r) => r.href === "/empresa/cotizaciones"));
  assert.ok(buscarPantallas("facturacion", "dueno").some((r) => r.href === "/empresa/facturas"));
  assert.equal(buscarPantallas("facturas", "proyectos").length, 0, "proyectos no ve facturas");
  assert.ok(buscarPantallas("correo", "ventas").every((r) => r.href !== "/empresa/correos/hub"), "el correo es del dueño");
  assert.ok(accesosComunes("proyectos").every((a) => !a.href.includes("factura")));
});

test("agrupar ordena por puntaje y en el orden de tipos", () => {
  const rs: Resultado[] = [
    { tipo: "ticket", id: "t", titulo: "TK-1", href: "/t", puntaje: 50 },
    { tipo: "cliente", id: "c1", titulo: "B", href: "/c1", puntaje: 10 },
    { tipo: "cliente", id: "c2", titulo: "A", href: "/c2", puntaje: 90 },
    { tipo: "lead", id: "l", titulo: "L", href: "/l", puntaje: 0 },
  ];
  const g = agrupar(rs);
  assert.deepEqual(g.map((x) => x.tipo), ["cliente", "ticket"]);
  assert.deepEqual(aplanar(g).map((r) => r.id), ["c2", "c1", "t"]);
});

test("flechas dan la vuelta", () => {
  assert.equal(moverIndice(-1, 3, 1), 0);
  assert.equal(moverIndice(-1, 3, -1), 2);
  assert.equal(moverIndice(2, 3, 1), 0);
  assert.equal(moverIndice(0, 3, -1), 2);
  assert.equal(moverIndice(0, 0, 1), -1);
});

test("número de documento escrito a medias", () => {
  assert.equal(numeroBuscado("TK-0012"), "0012");
  assert.equal(numeroBuscado("factura 45"), "45");
  assert.equal(numeroBuscado("acme"), null);
});

test("recientes sin repetir y con tope", () => {
  let l = [] as Parameters<typeof agregarReciente>[0];
  for (const n of [1, 2, 3, 1]) l = agregarReciente(l, { tipo: "cliente", titulo: `C${n}`, href: `/c/${n}` }, 3);
  assert.deepEqual(l.map((r) => r.href), ["/c/1", "/c/3", "/c/2"]);
});
