import { test } from "node:test";
import assert from "node:assert/strict";
import { leerVerificacion } from "./verificar-github";

const completa = { repo: "a/b", rama: "main", cuenta: null, privado: false, ultimoCommit: null, commits7: 1, commits30: 2, semanas: [0, 0, 0, 0, 0, 0, 1, 1], recientes: [], milestones: [], issues: { abiertas: 0, cerradas: 0 }, prsAbiertos: [], despliegue: null };

test("sin dato guardado: ni lectura ni error", () => {
  assert.deepEqual(leerVerificacion(null), { datos: null, error: null });
});

test("solo { error } (falló antes de la primera lectura buena) no pasa como lectura completa", () => {
  assert.deepEqual(leerVerificacion({ error: "Ninguna cuenta guardada puede leer este repositorio." }), { datos: null, error: "Ninguna cuenta guardada puede leer este repositorio." });
});

test("lectura completa con error posterior: conserva ambos", () => {
  const r = leerVerificacion({ ...completa, error: "GitHub rechazó el token." });
  assert.equal(r.datos?.commits30, 2);
  assert.equal(r.error, "GitHub rechazó el token.");
});
