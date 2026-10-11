import { test } from "node:test";
import assert from "node:assert/strict";

import { marcaVerificada, marcaValida, sesionVerificada } from "./mfa";

process.env.PIME_MFA_SECRET = "secreto-de-prueba-con-largo-suficiente";

test("marca de huella atada a la sesión y al usuario", () => {
  const m = marcaVerificada("u1", "s1");
  assert.equal(marcaValida(m, "u1", "s1"), true);
  assert.equal(marcaValida(m, "u2", "s1"), false);
  assert.equal(marcaValida(m, "u1", "s2"), false);
  assert.equal(marcaValida(m.slice(0, -2) + "xx", "u1", "s1"), false);
  assert.equal(marcaValida(undefined, "u1", "s1"), false);
});

test("aal2 basta; aal1 necesita la marca", () => {
  assert.equal(sesionVerificada({ sub: "u1", aal: "aal2", session_id: "s1" }, null), true);
  assert.equal(sesionVerificada({ sub: "u1", aal: "aal1", session_id: "s1" }, null), false);
  assert.equal(sesionVerificada({ sub: "u1", aal: "aal1", session_id: "s1" }, marcaVerificada("u1", "s1")), true);
  process.env.PIME_STAFF_MFA = "off";
  assert.equal(sesionVerificada({ sub: "u1", aal: "aal1" }, null), true);
  delete process.env.PIME_STAFF_MFA;
});
