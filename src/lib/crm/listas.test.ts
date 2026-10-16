import { test } from "node:test";
import assert from "node:assert/strict";
import { aQuery, haceCuanto, leerFiltros, paginar, pasaFiltros, opcionesDe } from "./listas";

const base = { internal: false, brandLine: "normal", responsableId: null, etiquetas: [] as string[], fuente: null, industria: null, saldo: 0, tickets: 0, proyectos: 0, contacto: 0 };
const yo = { id: "m1", esDueno: false };
const DIA = 86_400_000;

test("leer y escribir filtros sin perder ninguno; cambiar uno vuelve a la página 1", () => {
  const f = leerFiltros({ q: " acme ", filtro: "saldo", etiqueta: "vip", contacto: "60", pagina: "3", raro: "x", orden: "inventado" });
  assert.equal(f.q, "acme");
  assert.equal(f.orden, "");
  assert.equal(aQuery(f), "q=acme&filtro=saldo&etiqueta=vip&contacto=60&pagina=3");
  assert.equal(aQuery(f, { pagina: 4 }), "q=acme&filtro=saldo&etiqueta=vip&contacto=60&pagina=4");
  assert.equal(aQuery(f, { fuente: "web" }), "q=acme&filtro=saldo&etiqueta=vip&fuente=web&contacto=60");
});

test("filtros de etiqueta, fuente, responsable y contacto", () => {
  const f = leerFiltros({});
  const ahora = Date.now();
  assert.ok(pasaFiltros({ ...base, etiquetas: ["VIP"] }, { ...f, etiqueta: "vip" }, yo));
  assert.ok(!pasaFiltros(base, { ...f, fuente: "web" }, yo));
  assert.ok(pasaFiltros(base, { ...f, responsable: "sin" }, yo));
  assert.ok(!pasaFiltros({ ...base, responsableId: "m2" }, { ...f, responsable: "m1" }, yo));
  assert.ok(!pasaFiltros({ ...base, responsableId: null }, { ...f, filtro: "mios" }, yo), "sin responsable no es mío si no soy el dueño");
  assert.ok(pasaFiltros({ ...base, responsableId: null }, { ...f, filtro: "mios" }, { id: "d", esDueno: true }));
  assert.ok(pasaFiltros({ ...base, contacto: ahora - 45 * DIA }, { ...f, contacto: "30" }, yo, ahora));
  assert.ok(!pasaFiltros({ ...base, contacto: ahora - 45 * DIA }, { ...f, contacto: "60" }, yo, ahora));
  assert.ok(pasaFiltros({ ...base, contacto: 0 }, { ...f, contacto: "90" }, yo, ahora), "nunca contactado cuenta");
});

test("paginar ajusta la página que se pasa", () => {
  const filas = Array.from({ length: 120 }, (_, i) => i);
  const p = paginar(filas, 9);
  assert.equal(p.pagina, 3);
  assert.equal(p.paginas, 3);
  assert.deepEqual([p.desde, p.hasta, p.items.length], [101, 120, 20]);
  assert.equal(paginar([], 1).desde, 0);
});

test("textos de último contacto y opciones sin repetir", () => {
  const ahora = Date.now();
  assert.equal(haceCuanto(null), "Sin contacto");
  assert.equal(haceCuanto(ahora - 12 * DIA, ahora), "Hace 12 días");
  assert.equal(haceCuanto(ahora - 100 * DIA, ahora), "Hace 3 meses");
  assert.deepEqual(opcionesDe(["Web", "web", null, " Feria ", "Ámbar"]), ["Ámbar", "Feria", "Web"]);
});
