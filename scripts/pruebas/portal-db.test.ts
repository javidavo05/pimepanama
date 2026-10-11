/**
 * Prueba de la migración 0038 contra la base real. Crea datos con prefijo «[prueba]» y los borra al
 * final aunque algo falle. Correr con: npm run test:db
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
let clientId = "";

after(async () => {
  if (clientId) await prisma.client.delete({ where: { id: clientId } }).catch((e) => console.error("limpieza", e));
  await prisma.$disconnect();
});

test("portal: tickets, aprobaciones inmutables, pagos y cascada", async () => {
  const owner = await prisma.empresaUser.findFirst({ orderBy: { createdAt: "asc" } });
  assert.ok(owner, "hace falta un EmpresaUser");
  const client = await prisma.client.create({ data: { name: "[prueba] Cliente portal", userId: owner.id, brandLine: "premium" } });
  clientId = client.id;
  assert.equal(client.brandLine, "premium");

  const persona = await prisma.clientUser.create({ data: { userId: owner.id, clientId, email: "prueba-portal@example.com", fullName: "[prueba] Ana" } });
  const ticket = await prisma.ticket.create({ data: { userId: owner.id, clientId, title: "[prueba] No carga el reporte", openedByClientUserId: persona.id } });
  assert.match(ticket.number, /^TK-\d{4,}$/);
  await prisma.ticketMessage.create({ data: { ticketId: ticket.id, authorType: "cliente", clientUserId: persona.id, body: "Adjunto captura" } });

  const project = await prisma.project.create({ data: { userId: owner.id, clientId, name: "[prueba] Proyecto", kind: "modificacion" } });
  const orden = await prisma.changeOrder.create({ data: { userId: owner.id, projectId: project.id, clientId, title: "[prueba] Agregar filtro", total: 300 } });
  assert.match(orden.number, /^OC-\d{4,}$/);
  await prisma.projectPhase.create({ data: { projectId: project.id, name: "Filtro", price: 300, changeOrderId: orden.id } });

  const aprobacion = await prisma.approval.create({ data: { userId: owner.id, clientId, entityType: "orden_de_cambio", entityId: orden.id, decision: "aprobado", clientUserId: persona.id } });
  await assert.rejects(prisma.approval.update({ where: { id: aprobacion.id }, data: { decision: "rechazado" } }), /no se editan/);
  await assert.rejects(prisma.approval.delete({ where: { id: aprobacion.id } }), /no se editan/);

  await assert.rejects(prisma.payment.create({ data: { userId: owner.id, clientId, amount: 0 } }), "el monto debe ser mayor que 0");
  await prisma.payment.create({ data: { userId: owner.id, clientId, amount: 150, method: "yappy", status: "por_confirmar", reportedByClientUserId: persona.id } });
  await prisma.timeEntry.create({ data: { userId: owner.id, clientId, ticketId: ticket.id, minutes: 50, billedMinutes: 60, rate: 20, amount: 20 } });
  await assert.rejects(prisma.ticket.update({ where: { id: ticket.id }, data: { status: "inventado" } }), "el CHECK rechaza estados inventados");

  // Borrar el cliente se lleva todo, incluidas las aprobaciones (el trigger lo permite solo en cascada).
  await prisma.project.delete({ where: { id: project.id } });
  await prisma.client.delete({ where: { id: clientId } });
  clientId = "";
  assert.equal(await prisma.approval.count({ where: { id: aprobacion.id } }), 0);
  assert.equal(await prisma.ticket.count({ where: { id: ticket.id } }), 0);
});
