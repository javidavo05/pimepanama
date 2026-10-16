import { test } from "node:test";
import assert from "node:assert/strict";

import { tokenDeEncuesta, idDeToken, puntajeValido } from "./encuesta-token";

// La clave se lee al firmar, no al importar.
process.env.PIME_ENCUESTA_SECRET = "clave-de-prueba";

test("token de encuesta: vuelve al id y no se puede fabricar", () => {
  const id = "cmabc123def456ghi789";
  const t = tokenDeEncuesta(id);
  assert.equal(idDeToken(t), id);
  assert.equal(idDeToken(encodeURIComponent(t)), id);
  assert.equal(idDeToken(`${id}.falsa`), null);
  assert.equal(idDeToken(`otroid12345.${t.split(".")[1]}`), null, "la firma de un id no sirve para otro");
  assert.equal(idDeToken(""), null);
  assert.equal(idDeToken("sinpunto"), null);
});

test("puntaje: entero de 0 a 10", () => {
  assert.equal(puntajeValido("0"), 0);
  assert.equal(puntajeValido("10"), 10);
  assert.equal(puntajeValido(7), 7);
  assert.equal(puntajeValido("11"), null);
  assert.equal(puntajeValido("7.5"), null);
  assert.equal(puntajeValido(""), null);
  assert.equal(puntajeValido(null), null);
});
