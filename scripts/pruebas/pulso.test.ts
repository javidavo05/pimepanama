/**
 * Pulso de punta a punta contra la base real: el paquete packages/pime-pulso firma y envía, el receptor
 * verifica y aplica. Sondeo con respuestas simuladas. Avisos apagados. Limpia al final.
 */
process.env.PIME_PULSO_AVISOS = "off";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { crearPulso } from "../../packages/pime-pulso/pulso";
import { recibirPulso } from "../../src/lib/pulso/recibir";
import { credencialesDe } from "../../src/lib/pulso/datos";
import { sondearSistema, revisarPulsos } from "../../src/lib/pulso/sondeo";
import { avisosApagados } from "../../src/lib/pulso/alertas";

const prisma = new PrismaClient();
let clientId = "";
after(async () => {
  if (clientId) {
    await prisma.monitoredSystem.deleteMany({ where: { clientId } });
    await prisma.activityEvent.deleteMany({ where: { clientId } });
    await prisma.client.delete({ where: { id: clientId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

/** fetch que entrega la petición del paquete directo al receptor, y guarda las respuestas. */
const respuestas: { status: number; body: Record<string, unknown> }[] = [];
const alReceptor = (async (_url: string | URL, init?: RequestInit) => {
  const r = await recibirPulso(new Headers(init?.headers as HeadersInit), String(init?.body ?? ""));
  respuestas.push(r as never);
  return new Response(JSON.stringify(r.body), { status: r.status });
}) as typeof fetch;

test("eventos firmados, errores agrupados, caída y vuelta con una alerta cada una", async () => {
  const owner = await prisma.empresaUser.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const c = await prisma.client.create({ data: { userId: owner.id, name: "[prueba] Pulso" } });
  clientId = c.id;
  const s = await prisma.monitoredSystem.create({ data: { userId: owner.id, clientId, key: `prueba-pulso-${Date.now()}`, name: "[prueba] Citas", healthUrl: "https://citas.prueba.invalid/api/salud" } });
  const cred = credencialesDe(s);
  assert.ok(cred.secreto, "PIME_PULSO_SECRET tiene que estar en .env.local");
  const pulso = crearPulso({ key: cred.key, secreto: cred.secreto!, url: "http://pulso.local", version: "abc1234", fetch: alReceptor });

  // Latido: pasa a en línea.
  assert.equal(await pulso.latido(), true);
  let x = await prisma.monitoredSystem.findUniqueOrThrow({ where: { id: s.id } });
  assert.equal(x.status, "ok");
  assert.equal(x.appVersion, "abc1234");

  // Firma mala y secreto viejo: 401, nada cambia.
  const malo = crearPulso({ key: cred.key, secreto: "otro", url: "x", fetch: alReceptor });
  assert.equal(await malo.latido(), false);
  assert.equal(respuestas.at(-1)?.status, 401);

  // El mismo error 3 veces seguidas: el paquete manda 1; con otro id distinto en el texto, misma huella en Pime.
  await pulso.error(new Error("Cita 123 no encontrada"), { where: "GET /api/citas" });
  await pulso.error(new Error("Cita 123 no encontrada"), { where: "GET /api/citas" });
  await pulso.error(new Error("Cita 123 no encontrada"), { where: "GET /api/citas" });
  const otro = crearPulso({ key: cred.key, secreto: cred.secreto!, url: "x", fetch: alReceptor });
  await otro.error(new Error("Cita 456 no encontrada"), { where: "GET /api/citas" });
  const incs = await prisma.systemIncident.findMany({ where: { systemId: s.id } });
  assert.equal(incs.length, 1, "un solo problema agrupado");
  assert.equal(incs[0].count, 2);
  assert.equal(avisosApagados.filter((a) => a.titulo === "error nuevo").length, 1, "avisa solo la primera vez");

  // Error grave: aviso grave.
  await pulso.error(new Error("No conecta a la base"), { level: "grave" });
  assert.ok(avisosApagados.some((a) => a.titulo === "error grave" && a.grave));

  // Repetición del mismo cuerpo firmado: duplicado.
  const cuerpo = JSON.stringify({ id: "evt-repetido-0001", type: "deploy", data: { version: "v2" } });
  const ts = String(Date.now());
  const { firmar } = await import("../../src/lib/pulso/firma");
  const h = new Headers({ "x-pime-system": cred.key, "x-pime-timestamp": ts, "x-pime-signature": firmar(cred.secreto!, ts, cuerpo) });
  assert.equal((await recibirPulso(h, cuerpo)).body.outcome, "applied");
  assert.equal((await recibirPulso(h, cuerpo)).body.outcome, "duplicate");

  // Sondeo: un fallo no tumba, el segundo sí y avisa una vez; luego vuelve y avisa la vuelta.
  const falla = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
  const bien = (async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
  await sondearSistema(s.id, falla);
  x = await prisma.monitoredSystem.findUniqueOrThrow({ where: { id: s.id } });
  assert.equal(x.status, "ok");
  await sondearSistema(s.id, falla);
  await sondearSistema(s.id, falla);
  x = await prisma.monitoredSystem.findUniqueOrThrow({ where: { id: s.id } });
  assert.equal(x.status, "caido");
  assert.equal(avisosApagados.filter((a) => a.titulo === "no responde").length, 1, "una sola alerta por caída");
  const visto = await prisma.activityEvent.findFirst({ where: { clientId, kind: "sistema_caido", visibility: "cliente" } });
  assert.ok(visto, "el cliente lo ve en su línea de tiempo");
  await sondearSistema(s.id, bien);
  x = await prisma.monitoredSystem.findUniqueOrThrow({ where: { id: s.id } });
  assert.equal(x.status, "ok");
  assert.ok(avisosApagados.some((a) => a.titulo === "volvió a funcionar" && a.grave));

  // Rotar el secreto invalida el anterior.
  await prisma.monitoredSystem.update({ where: { id: s.id }, data: { secretVersion: { increment: 1 } } });
  assert.equal(await pulso.latido(), false);

  // La revisión general corre sin romper (sondea solo los activos con dirección de salud).
  const r = await revisarPulsos(bien);
  assert.ok(r.sistemas >= 1);
});
