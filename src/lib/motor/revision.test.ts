import { test } from "node:test";
import assert from "node:assert/strict";
import { resumirRevision, type EntradaRevision } from "./revision";

const base: EntradaRevision = { repo: null, liveUrl: null, urlPlataforma: null, sistema: null, enlaceSinRespuesta: null, github: null, hook: false, fases: [] };
const sistema = (status: string, conPulso = false) => ({ id: "s1", status, statusDetail: status === "caido" ? "No respondió en 10 s" : null, lastLatencyMs: 120, lastEventAt: conPulso ? new Date() : null, healthUrl: "https://x.com" });

test("sin enlace ni repo: sin revisar y pide el enlace", () => {
  const r = resumirRevision(base);
  assert.equal(r.estado, "atencion");
  assert.equal(r.modo, "mantenimiento");
  assert.match(r.avisos[0].texto, /Sin enlace/);
});

test("caído o GitHub con error es problema", () => {
  assert.equal(resumirRevision({ ...base, liveUrl: "https://x.com", sistema: sistema("caido") }).estado, "problema");
  assert.equal(resumirRevision({ ...base, repo: "a/b", liveUrl: "https://x.com", sistema: sistema("ok"), github: { error: "GitHub rechazó el token." } }).estado, "problema");
});

test("fases sin marcador piden atención; con marcador y sin webhook solo sugiere", () => {
  const sin = resumirRevision({ ...base, repo: "a/b", liveUrl: "https://x.com", sistema: sistema("ok", true), github: {}, fases: [{ progress: 50, githubMilestone: null }, { progress: 0, githubMilestone: 3 }] });
  assert.equal(sin.estado, "atencion");
  assert.equal(sin.modo, "fases");
  assert.equal(sin.fases.conMarcador, 1);
  assert.equal(sin.fases.avance, 25);
  assert.match(sin.avisos[0].texto, /1 fase sin marcador/);
  const con = resumirRevision({ ...base, repo: "a/b", liveUrl: "https://x.com", sistema: sistema("ok", true), github: {}, fases: [{ progress: 100, githubMilestone: 1 }] });
  assert.equal(con.estado, "ok");
  assert.match(con.sugerencias[0].texto, /webhook/);
});

test("enlace de la plataforma: revisa la salud y sugiere mostrarlo al cliente", () => {
  const r = resumirRevision({ ...base, urlPlataforma: "https://panel.x.com", sistema: sistema("ok") });
  assert.equal(r.enlace, "https://panel.x.com");
  assert.equal(r.enlaceVisibleCliente, false);
  assert.equal(r.estado, "ok");
  assert.ok(r.sugerencias.some((s) => /no ve el enlace/.test(s.texto)));
  assert.ok(r.sugerencias.some((s) => /Sin Pulso/.test(s.texto)));
});

test("enlace que no respondió al crear el sistema se avisa", () => {
  const r = resumirRevision({ ...base, liveUrl: "https://viejo.vercel.app", enlaceSinRespuesta: "https://viejo.vercel.app" });
  assert.equal(r.estado, "atencion");
  assert.match(r.avisos[0].texto, /no respondió/);
});

test("proyecto con fases y sin repo avisa que su avance no se mueve solo", () => {
  const r = resumirRevision({ ...base, liveUrl: "https://x.com", sistema: sistema("ok"), fases: [{ progress: 0, githubMilestone: null }] });
  assert.match(r.avisos[0].texto, /no repositorio/);
});

test("fase terminada o llevada a mano no cuenta como sin marcador", () => {
  const r = resumirRevision({ ...base, repo: "a/b", liveUrl: "https://x.com", sistema: sistema("ok", true), github: {}, hook: true, fases: [{ progress: 0, githubMilestone: null, sinMarcador: true }, { progress: 100, githubMilestone: null, sinMarcador: true }, { progress: 10, githubMilestone: 4 }] });
  assert.equal(r.estado, "ok");
  assert.equal(r.avisos.length, 0);
});
