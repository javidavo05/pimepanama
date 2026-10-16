import { test } from "node:test";
import assert from "node:assert/strict";
import { aCsv, celdaCsv, detectarSeparador, parseCsv } from "./csv";
import { contactoDeFila, revisarFilas, sugerirMapeo } from "./csv-importar";

test("comas, comillas escapadas y saltos de línea dentro de comillas", () => {
  const t = 'nombre,notas\n"Pérez, Juan","dijo ""hola""\ny se fue"\nAna,ok\n';
  assert.deepEqual(parseCsv(t), [["nombre", "notas"], ["Pérez, Juan", 'dijo "hola"\ny se fue'], ["Ana", "ok"]]);
});

test("punto y coma de Excel en español, BOM y CRLF", () => {
  const t = "﻿Nombre;Correo\r\nJosé;jose@x.com\r\n\r\nMaría;\r\n";
  assert.equal(detectarSeparador(t), ";");
  assert.deepEqual(parseCsv(t), [["Nombre", "Correo"], ["José", "jose@x.com"], ["María", ""]]);
});

test("el separador no se cuenta dentro de comillas", () => {
  assert.equal(detectarSeparador('"a;b;c",d,e\n'), ",");
  assert.equal(detectarSeparador("a\tb\tc\n"), "\t");
});

test("última celda vacía entre comillas y archivo sin salto final", () => {
  assert.deepEqual(parseCsv('a,""'), [["a", ""]]);
  assert.deepEqual(parseCsv("a,b"), [["a", "b"]]);
});

test("escribir CSV: comillas, BOM y sin fórmulas", () => {
  assert.equal(celdaCsv('a,"b"'), '"a,""b"""');
  assert.equal(celdaCsv("=SUMA(A1)"), "'=SUMA(A1)");
  assert.equal(celdaCsv("+507 6000-0000"), "+507 6000-0000", "un teléfono queda igual");
  assert.equal(celdaCsv("-5"), "-5");
  assert.equal(celdaCsv("+cmd"), "'+cmd");
  assert.equal(celdaCsv(null), "");
  const csv = aCsv(["Nombre", "Notas"], [["Ana", "línea 1\nlínea 2"]]);
  assert.ok(csv.startsWith("﻿"));
  assert.deepEqual(parseCsv(csv), [["Nombre", "Notas"], ["Ana", "línea 1\nlínea 2"]], "ida y vuelta");
});

test("sugerencia de columnas por nombre", () => {
  const m = sugerirMapeo(["Nombre del contacto", "Razón social", "E-mail", "Teléfono", "RUC", "Sector", "Tags", "Columna rara"]);
  assert.equal(m[0], "contacto");
  assert.equal(m[1], "name");
  assert.equal(m[2], "email");
  assert.equal(m[3], "phone");
  assert.equal(m[4], "ruc");
  assert.equal(m[5], "industria");
  assert.equal(m[6], "etiquetas");
  assert.equal(m[7], "");
});

test("revisión: errores, repetidos contra la base y dentro del archivo", () => {
  const mapeo = sugerirMapeo(["Nombre", "Empresa", "Correo", "Etiquetas"]);
  const r = revisarFilas([
    ["Ana", "", "ANA@x.com", "vip, web"],
    ["", "", "x@x.com", ""],
    ["Luis", "", "luis@", ""],
    ["Ana B", "", "ana@x.com", ""],
    ["Pedro", "", "pedro@y.com", ""],
    ["", "Acme S.A.", "", ""],
  ], mapeo, ["pedro@y.com"]);
  assert.deepEqual(r.filas.map((f) => f.estado), ["crear", "error", "error", "repetido", "repetido", "crear"]);
  assert.equal(r.filas[0].email, "ana@x.com");
  assert.deepEqual(r.filas[0].etiquetas, ["vip", "web"]);
  assert.equal(r.filas[1].motivo, "Sin nombre ni empresa");
  assert.equal(r.filas[2].motivo, "Correo inválido");
  assert.equal(r.filas[5].name, "Acme S.A.", "sin nombre usa la empresa");
  assert.equal(r.filas[0].fila, 2, "la fila 1 es la de encabezados");
  assert.deepEqual([r.crear, r.repetidos, r.errores], [2, 2, 2]);
});

test("contacto principal solo si trae persona, correo o teléfono", () => {
  const m = sugerirMapeo(["Empresa", "Contacto", "Teléfono"]);
  const [a, b] = revisarFilas([["Acme", "Rosa", ""], ["Beta", "", ""]], m, []).filas;
  assert.deepEqual(contactoDeFila(a), { nombre: "Rosa", email: null, telefono: null, cargo: null });
  assert.equal(contactoDeFila(b), null);
});
