import { test } from "node:test";
import assert from "node:assert/strict";
import { completitudProyecto, esRequisito, type DatosCompletitud } from "./completitud";

const vacio: DatosCompletitud = {
  id: "p1", clientes: [], fases: [], presupuesto: null, cotizaciones: 0, contratos: 0, repo: null, githubCheck: null,
  plataformas: [], reuniones: 0, portalVisible: false, facturas: 0, planDeCobro: false, waived: [],
};
const completo: DatosCompletitud = {
  ...vacio, clientes: [{ id: "c1" }], fases: [{ price: 500 }], cotizaciones: 1, repo: "pime/app", githubCheck: {},
  plataformas: [{ id: "pl1", vercel: true, supabase: true }], reuniones: 2, portalVisible: true, facturas: 1,
};
const req = (d: DatosCompletitud, k: string) => completitudProyecto(d).requisitos.find((r) => r.key === k)!;

test("completitud: proyecto vacío arranca en 0 % y todo trae su acción", () => {
  const c = completitudProyecto(vacio);
  assert.equal(c.pct, 0);
  assert.equal(c.aplican, 9);
  assert.equal(c.faltan.length, 9);
  for (const r of c.faltan) assert.ok(r.accion, r.key);
});

test("completitud: proyecto completo es 100 % y no ofrece acciones", () => {
  const c = completitudProyecto(completo);
  assert.equal(c.pct, 100);
  assert.equal(c.faltan.length, 0);
  assert.ok(c.requisitos.every((r) => r.accion === null));
});

test("completitud: «No aplica» saca el requisito de la cuenta", () => {
  const sinDb = { ...completo, plataformas: [{ id: "pl1", vercel: true, supabase: false }] };
  assert.equal(completitudProyecto(sinDb).pct, 89); // 8 de 9
  const c = completitudProyecto({ ...sinDb, waived: ["supabase"] });
  assert.equal(c.pct, 100);
  assert.equal(c.aplican, 8);
  assert.ok(req({ ...sinDb, waived: ["supabase"] }, "supabase").waived);
});

test("completitud: proyecto interno (sin cliente «No aplica») no exige el portal", () => {
  const interno = { ...completo, clientes: [], portalVisible: false, waived: ["cliente"] };
  const c = completitudProyecto(interno);
  assert.equal(c.pct, 100);
  assert.ok(req(interno, "portal").auto);
});

test("completitud: ignora claves desconocidas en linkWaived", () => {
  const c = completitudProyecto({ ...vacio, waived: ["inventada", "repo"] });
  assert.equal(c.aplican, 8);
  assert.equal(esRequisito("inventada"), false);
  assert.equal(esRequisito("repo"), true);
});

test("completitud: el repo solo cuenta si la verificación guardada no tiene error", () => {
  assert.equal(req({ ...completo, githubCheck: null }, "repo").ok, false);
  assert.match(req({ ...completo, githubCheck: null }, "repo").detalle, /sin verificar/);
  assert.equal(req({ ...completo, githubCheck: { error: "403" } }, "repo").ok, false);
  const sinRepo = req({ ...completo, repo: null }, "repo");
  assert.deepEqual(sinRepo.accion, { tipo: "pestana", tab: "repo", ancla: "conectar-repo", label: "Conectar repo" });
});

test("completitud: sin plataforma lleva al asistente; con plataforma incompleta, a abrirla", () => {
  const nueva = req(vacio, "vercel").accion;
  assert.deepEqual(nueva, { tipo: "enlace", href: "/empresa/platforms?nueva=1&proyecto=p1", label: "Registrar plataforma" });
  const abrir = req({ ...vacio, plataformas: [{ id: "pl9", vercel: false, supabase: true }] }, "vercel").accion;
  assert.deepEqual(abrir, { tipo: "enlace", href: "/empresa/platforms?abrir=pl9", label: "Enlazar Vercel" });
});

test("completitud: fases sin precio no cuentan, el presupuesto sí", () => {
  assert.equal(req({ ...vacio, fases: [{ price: 0 }] }, "fases").ok, false);
  assert.equal(req({ ...vacio, presupuesto: 1200 }, "fases").ok, true);
});

test("completitud: el plan de financiación cuenta como plan de cobro", () => {
  assert.equal(req({ ...vacio, planDeCobro: true }, "cobro").ok, true);
});

test("completitud: si todo está marcado «No aplica», queda en 100 %", () => {
  const c = completitudProyecto({ ...vacio, waived: ["cliente", "fases", "acuerdo", "repo", "vercel", "supabase", "reunion", "cobro"] });
  assert.equal(c.aplican, 0);
  assert.equal(c.pct, 100);
});

test("completitud: producto de la empresa interna ⇒ cotización, cobro y portal no aplican solos", () => {
  const interno: DatosCompletitud = { ...vacio, clientes: [{ id: "pime" }], interno: true };
  const c = completitudProyecto(interno);
  for (const k of ["acuerdo", "cobro", "portal"]) {
    const r = c.requisitos.find((x) => x.key === k)!;
    assert.ok(r.auto, k);
    assert.equal(r.accion, r.ok ? null : r.accion);
  }
  assert.equal(c.aplican, 6); // cliente, fases, repo, vercel, supabase, reunión
  assert.ok(!c.faltan.some((r) => ["acuerdo", "cobro", "portal"].includes(r.key)));
  // El mismo proyecto sin la marca de interno sí los exige.
  assert.equal(completitudProyecto({ ...interno, interno: false }).aplican, 9);
});
