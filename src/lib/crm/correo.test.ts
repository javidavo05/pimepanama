import { test } from "node:test";
import assert from "node:assert/strict";
import { cuerpoHtml, primerNombre, rellenar, rellenarTexto, textoAHtml, variablesDesconocidas } from "./correo";
import { leerTokenBaja, tokenBaja } from "./correo-baja";
import { elegirDestinatarios, FILTRO_VACIO, normalizarFiltro, type ClienteSegmento } from "./campanas";

test("rellenar pone cada variable y deja vacías las que no tienen dato", () => {
  const html = rellenar("Hola {{nombre}}, de {{ empresa }}. Firma: {{mi_nombre}}{{contacto}}", { nombre: "Ana", empresa: "Acme", mi_nombre: "Javier" });
  assert.equal(html, "Hola Ana, de Acme. Firma: Javier");
});

test("rellenar escapa el HTML de los datos", () => {
  const html = rellenar("<p>{{empresa}}</p>", { empresa: `<script>alert("x")</script> & O'Brien` });
  assert.equal(html, "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; O&#39;Brien</p>");
});

test("una variable desconocida queda a la vista y se reporta", () => {
  assert.equal(rellenar("Tel: {{telefono}}", { nombre: "Ana" }), "Tel: {{telefono}}");
  assert.deepEqual(variablesDesconocidas("{{nombre}} {{telefono}} {{telefono}}"), ["telefono"]);
});

test("rellenarTexto no escapa (asunto) y no deja saltos de línea", () => {
  assert.equal(rellenarTexto("Propuesta para {{empresa}}\n", { empresa: "Pérez & Hijos" }), "Propuesta para Pérez & Hijos ");
});

test("el cuerpo de texto se escapa, separa párrafos y enlaza URLs", () => {
  const html = textoAHtml("Hola <b>\nlínea dos\n\nVer https://pimepanama.com/x.");
  assert.match(html, /^<p [^>]*>Hola &lt;b&gt;<br>línea dos<\/p><p /);
  assert.match(html, /<a href="https:\/\/pimepanama.com\/x" [^>]*>https:\/\/pimepanama.com\/x<\/a>\./);
  assert.match(cuerpoHtml("Hola {{nombre}}", { nombre: "<i>Ana</i>" }), /Hola &lt;i&gt;Ana&lt;\/i&gt;/);
  assert.equal(primerNombre("  María José González "), "María");
});

test("token de baja: válido, alterado y de otro secreto", () => {
  const t = tokenBaja("user_1", "Ana@Acme.com ", "secreto");
  assert.deepEqual(leerTokenBaja(t, "secreto"), { userId: "user_1", email: "ana@acme.com" });
  assert.equal(leerTokenBaja(t, "otro"), null, "otro secreto");
  const otraCarga = Buffer.from("user_1:victima@acme.com").toString("base64url");
  assert.equal(leerTokenBaja(`${otraCarga}.${t.split(".")[1]}`, "secreto"), null, "cambiar el correo invalida la firma");
  assert.equal(leerTokenBaja(t.slice(0, -2), "secreto"), null, "firma recortada");
  assert.equal(leerTokenBaja("basura", "secreto"), null);
});

const cli = (o: Partial<ClienteSegmento> & { id: string }): ClienteSegmento => ({
  name: o.id, company: null, email: null, brandLine: "normal", fuente: null, industria: null, etiquetas: [], responsableId: null,
  internal: false, archivedAt: null, proyectoActivo: false, contactos: [], ...o,
});

test("destinatarios: contacto principal o correo del cliente, sin bajas, internos, archivados ni duplicados", () => {
  const clientes = [
    cli({ id: "a", email: "general@a.com", company: "A S.A.", contactos: [{ nombre: "Luis", email: "Luis@A.com", principal: true }, { nombre: "Otro", email: "otro@a.com", principal: false }] }),
    cli({ id: "b", email: "b@b.com" }),
    cli({ id: "c", email: "baja@c.com" }),
    cli({ id: "d", email: "luis@a.com" }),
    cli({ id: "e", email: "e@e.com", internal: true }),
    cli({ id: "f", email: "f@f.com", archivedAt: new Date() }),
    cli({ id: "g", email: "no-es-correo" }),
  ];
  const { destinatarios, fuera } = elegirDestinatarios(clientes, FILTRO_VACIO, ["BAJA@c.com"]);
  assert.deepEqual(destinatarios, [
    { clientId: "a", email: "luis@a.com", nombre: "Luis", empresa: "A S.A." },
    { clientId: "b", email: "b@b.com", nombre: "b", empresa: "b" },
  ]);
  assert.deepEqual(fuera, { bajas: 1, sinCorreo: 1, duplicados: 1 });
});

test("filtros: etiquetas, línea, responsable y proyecto activo", () => {
  const clientes = [
    cli({ id: "a", email: "a@a.com", etiquetas: ["vip"], brandLine: "premium", proyectoActivo: true, responsableId: "m1" }),
    cli({ id: "b", email: "b@b.com", etiquetas: ["frio"], fuente: "Feria" }),
  ];
  const ids = (f: unknown) => elegirDestinatarios(clientes, normalizarFiltro(f), []).destinatarios.map((d) => d.clientId);
  assert.deepEqual(ids({ etiquetas: ["vip", "otra"] }), ["a"]);
  assert.deepEqual(ids({ linea: "normal" }), ["b"]);
  assert.deepEqual(ids({ proyecto: "no" }), ["b"]);
  assert.deepEqual(ids({ proyecto: "si", responsableId: "m1" }), ["a"]);
  assert.deepEqual(ids({ fuente: "Feria" }), ["b"]);
  assert.deepEqual(ids({ linea: "raro", proyecto: 3 }), ["a", "b"], "valores inválidos no filtran");
});
