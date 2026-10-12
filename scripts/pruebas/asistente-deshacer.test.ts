/**
 * Cada operación del asistente se deshace y deja la base como estaba, contra la base real con un cliente
 * «[prueba]» que se borra al final. Correr con: npm run test:db
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import { OPERACIONES, type U } from "../../src/lib/asistente/operaciones";
import { deshacerPasos } from "../../src/lib/asistente/pasos";
import { requiereConfirmacion } from "../../src/lib/asistente/reglas";
import { limpiarCliente } from "./limpiar";

let clientId = "";
const extras: { tareas: string[]; gastos: string[] } = { tareas: [], gastos: [] };
after(async () => {
  await prisma.task.deleteMany({ where: { id: { in: extras.tareas } } });
  await prisma.expense.deleteMany({ where: { id: { in: extras.gastos } } });
  if (clientId) await limpiarCliente(clientId).catch((e) => console.error("limpieza", e));
  await prisma.$disconnect();
});

const sinTiempos = (x: unknown) => JSON.parse(JSON.stringify(x, (k, v) => (k === "updatedAt" ? undefined : v)));

async function foto(cid: string) {
  const proyectos = await prisma.project.findMany({ where: { clientId: cid }, orderBy: { createdAt: "asc" }, include: { phases: { orderBy: { createdAt: "asc" } }, clients: true } });
  const pids = proyectos.map((p) => p.id);
  const [cliente, docs, pagos, cuotas, tareas, tickets, gastos, notas] = await Promise.all([
    prisma.client.findUnique({ where: { id: cid } }),
    prisma.document.findMany({ where: { clientId: cid }, orderBy: { createdAt: "asc" } }),
    prisma.payment.findMany({ where: { clientId: cid }, orderBy: { createdAt: "asc" } }),
    prisma.paymentSchedule.findMany({ where: { document: { clientId: cid } }, orderBy: { createdAt: "asc" } }),
    prisma.task.findMany({ where: { projectId: { in: pids } }, orderBy: { createdAt: "asc" } }),
    prisma.ticket.findMany({ where: { clientId: cid }, include: { messages: true } }),
    prisma.expense.findMany({ where: { projectId: { in: pids } } }),
    prisma.activityEvent.findMany({ where: { clientId: cid, kind: "nota_interna" } }),
  ]);
  return sinTiempos({ cliente, proyectos, docs, pagos, cuotas, tareas, tickets, gastos, notas });
}

test("deshacer deja la base como estaba, operación por operación", async () => {
  const u = (await prisma.empresaUser.findFirstOrThrow({ orderBy: { createdAt: "asc" }, include: { config: true } })) as unknown as U;
  const c = await prisma.client.create({ data: { userId: u.id, name: "[prueba] Deshacer" } });
  clientId = c.id;
  const p = await prisma.project.create({ data: { userId: u.id, clientId, name: "[prueba] Proyecto deshacer", clients: { create: { clientId } } } });
  const f1 = await prisma.projectPhase.create({ data: { projectId: p.id, name: "Fase 1", price: 500, status: "en_curso", sortOrder: 0 } });
  const f2 = await prisma.projectPhase.create({ data: { projectId: p.id, name: "Fase 2", price: 700, status: "pendiente", sortOrder: 1 } });

  // Un pago y una tarea de base para editar, mover y borrar.
  const base = await OPERACIONES.pago_registrar.ejecutar(u, { clienteId: clientId, monto: 200, fecha: "2026-09-01", metodo: "otro", faseId: f1.id, proyectoId: p.id });
  const pagoId = base.resultId;
  const tarea = await OPERACIONES.tarea_crear.ejecutar(u, { titulo: "[prueba] tarea", proyectoId: p.id, vence: "2026-10-20", prioridad: "MEDIUM" });
  const ticket = await OPERACIONES.ticket_crear.ejecutar(u, { clienteId: clientId, titulo: "[prueba] ticket", tipo: "soporte", prioridad: "normal", proyectoId: p.id, interno: false });
  const gasto = await OPERACIONES.gasto_crear.ejecutar(u, { titulo: "[prueba] gasto", monto: 40, categoria: "OTRO", fecha: "2026-10-01", pagado: false, proyectoId: p.id });
  extras.tareas.push(tarea.resultId); extras.gastos.push(gasto.resultId);
  const factura = await OPERACIONES.factura_crear.ejecutar(u, { clienteId: clientId, concepto: "[prueba] borrador", monto: 120, proyectoId: p.id, emitir: false });

  const casos: [string, Record<string, unknown>][] = [
    ["cliente_editar", { clienteId: clientId, telefono: "6000-0000", linea: "premium" }],
    ["cliente_archivar", { clienteId: clientId }],
    ["proyecto_editar", { proyectoId: p.id, nombre: "[prueba] Otro nombre", estado: "pausado", presupuesto: 900 }],
    ["proyecto_ligar_repo", { proyectoId: p.id, repo: "https://github.com/prueba/repo" }],
    ["fase_crear", { proyectoId: p.id, nombre: "Fase 9", precio: 300, estado: "en_curso" }],
    ["fase_editar", { faseId: f1.id, precio: 650, estado: "en_revision", avance: 80 }],
    ["fase_mover", { faseId: f2.id, posicion: 1 }],
    ["fase_borrar", { faseId: f2.id }],
    ["pago_registrar", { clienteId: clientId, monto: 90, fecha: "2026-10-02" }],
    ["pago_editar", { pagoId, monto: 250, fecha: "2026-09-02", metodo: "yappy" }],
    ["pago_mover", { pagoId, faseId: f2.id }],
    ["pago_mover", { pagoId, aparte: true }],
    ["pago_borrar", { pagoId }],
    ["factura_crear", { clienteId: clientId, concepto: "[prueba] servicio", monto: 80 }],
    ["factura_emitir", { facturaId: factura.resultId }],
    ["factura_editar", { facturaId: factura.resultId, concepto: "[prueba] cambiado", monto: 150, vence: "2026-12-01" }],
    ["factura_anular", { facturaId: factura.resultId }],
    ["facturar_fase", { faseId: f2.id }],
    ["plan_definir", { proyectoId: p.id, total: 900, abono: 100, cuotas: 4, frecuencia: "mensual", primeraFecha: "2026-11-01" }],
    ["tarea_editar", { tareaId: tarea.resultId, titulo: "[prueba] tarea editada", vence: "2026-11-01", prioridad: "alta" }],
    ["tarea_completar", { tareaId: tarea.resultId }],
    ["tarea_borrar", { tareaId: tarea.resultId }],
    ["ticket_cambiar", { ticketId: ticket.resultId, estado: "resuelto", prioridad: "alta" }],
    ["ticket_nota", { ticketId: ticket.resultId, texto: "[prueba] nota interna" }],
    ["gasto_editar", { gastoId: gasto.resultId, monto: 60, pagado: true }],
    ["gasto_borrar", { gastoId: gasto.resultId }],
    ["nota_crear", { proyectoId: p.id, texto: "[prueba] nota" }],
  ];
  for (const [nombre, args] of casos) {
    const antes = await foto(clientId);
    const prep = await OPERACIONES[nombre].preparar(u, args);
    assert.ok(!("error" in prep), `${nombre}: ${"error" in prep ? prep.error : ""}`);
    if ("error" in prep) continue;
    const h = await OPERACIONES[nombre].ejecutar(u, prep.payload);
    assert.notDeepEqual(await foto(clientId), antes, `${nombre} no cambió nada`);
    await deshacerPasos(u.id, h.pasos);
    assert.deepEqual(await foto(clientId), antes, `${nombre}: deshacer no dejó la base como estaba`);
  }

  // Reglas de confirmación aplicadas a operaciones reales.
  const conf = async (n: string, a: Record<string, unknown>) => { const r = await OPERACIONES[n].preparar(u, a); assert.ok(!("error" in r), n); return "error" in r ? null : requiereConfirmacion(r.evalua).confirmar; };
  assert.equal(await conf("pago_registrar", { clienteId: clientId, monto: 300, fecha: "2026-08-28" }), false);
  assert.equal(await conf("pago_registrar", { clienteId: clientId, monto: 2500, fecha: "2026-08-29" }), true);
  assert.equal(await conf("fase_editar", { faseId: f1.id, precio: 1200 }), false, "subir 700 no llega a 1,000");
  assert.equal(await conf("fase_editar", { faseId: f1.id, precio: 1600 }), true);
  assert.equal(await conf("fase_borrar", { faseId: f2.id }), true);
  assert.equal(await conf("tarea_crear", { titulo: "x" }), false);
});
