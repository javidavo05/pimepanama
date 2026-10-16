import { test } from "node:test";
import assert from "node:assert/strict";
import { puedeVer, seccionDeRuta } from "./permisos";

test("el dueño ve todo, incluido el correo y la configuración", () => {
  assert.equal(puedeVer("dueno", "correos"), true);
  assert.equal(puedeVer("dueno", "configuracion"), true);
});

test("cada área ve lo suyo y lo común", () => {
  assert.equal(puedeVer("ventas", "leads"), true);
  assert.equal(puedeVer("ventas", "dinero"), false);
  assert.equal(puedeVer("finanzas", "facturas"), true);
  assert.equal(puedeVer("finanzas", "tickets"), false);
  assert.equal(puedeVer("proyectos", "sistemas"), true);
  for (const a of ["ventas", "proyectos", "finanzas"]) {
    assert.equal(puedeVer(a, "clientes"), true);
    assert.equal(puedeVer(a, "correos"), false, `${a} no ve el correo del dueño`);
    assert.equal(puedeVer(a, "configuracion"), true, "su configuración personal");
    assert.equal(puedeVer(a, "empresa"), false, "los datos de la empresa son del dueño");
  }
});

test("un área desconocida no abre nada fuera de lo del dueño sin área", () => {
  assert.equal(puedeVer("otra", "clientes"), false);
  assert.equal(puedeVer(null, "dinero"), true, "sin área = dueño (cuentas viejas)");
});

test("ruta → sección", () => {
  assert.equal(seccionDeRuta("/empresa"), "inicio");
  assert.equal(seccionDeRuta("/empresa/cuentas-por-cobrar"), "cobros");
  assert.equal(seccionDeRuta("/empresa/platforms?abrir=1".split("?")[0]), "sistemas");
  assert.equal(seccionDeRuta("/empresa/correos/hub"), "correos");
});
