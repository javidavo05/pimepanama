/**
 * Todo pago queda con su factura emitida en la cuenta del cliente (motor/pagos.ts), contra la base real.
 * Crea un cliente «[prueba]» y lo borra todo al final aunque algo falle. Correr con: npm run test:db
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import { registrarPago } from "../../src/lib/portal/empresa";
import { facturarPagosSinFactura, borrarPago } from "../../src/lib/motor/pagos";
import { facturasDelCliente } from "../../src/lib/portal/datos";
import { fichaCliente } from "../../src/lib/portal/ficha";
import { limpiarCliente } from "./limpiar";

let clientId = "";

after(async () => {
  if (clientId) await limpiarCliente(clientId).catch((e) => console.error("limpieza", e));
  await prisma.$disconnect();
});

test("pagos: siempre con factura emitida, en la cuenta del cliente", async () => {
  const u = await prisma.empresaUser.findFirstOrThrow({ orderBy: { createdAt: "asc" }, include: { config: true } });
  const c = await prisma.client.create({ data: { userId: u.id, name: "[prueba] Pagos y facturas" } });
  clientId = c.id;
  const p = await prisma.project.create({ data: { userId: u.id, clientId, name: "[prueba] Proyecto", clients: { create: { clientId } } } });
  const fase = await prisma.projectPhase.create({ data: { projectId: p.id, name: "Fase 3", price: 2000, status: "en_curso", startedAt: new Date() } });
  const fase4 = await prisma.projectPhase.create({ data: { projectId: p.id, name: "Fase 4", price: 800, status: "en_curso", startedAt: new Date(), sortOrder: 1 } });

  // La fase inicia: se debe aunque no tenga factura.
  let ficha = await fichaCliente(u.id, clientId);
  assert.equal(ficha?.saldo.pendiente, 2800);

  // Pago de una fase sin factura: se emite la de la fase por su precio y se le abona.
  const p1 = await registrarPago(u, { clientId, phaseId: fase.id, monto: 300, fecha: "2026-08-28", metodo: "otro" });
  assert.equal(p1.facturaCreada, true);
  assert.equal(p1.phaseId, fase.id);
  assert.equal(p1.projectId, p.id);
  const f1 = await prisma.document.findUniqueOrThrow({ where: { id: p1.documentId! } });
  assert.equal(Number(f1.total), 2000);
  assert.equal(f1.status, "PARTIALLY_PAID");
  assert.equal((await prisma.projectPhase.findUniqueOrThrow({ where: { id: fase.id } })).invoiceId, f1.id);

  // Segundo pago de la misma fase: a la misma factura.
  const p2 = await registrarPago(u, { clientId, phaseId: fase.id, monto: 500, fecha: "2026-09-17", metodo: "otro" });
  assert.equal(p2.documentId, f1.id);
  assert.equal(p2.facturaCreada, false);
  assert.equal(Number((await prisma.document.findUniqueOrThrow({ where: { id: f1.id } })).amountPaid), 800);

  // Pago aparte: factura por el monto, ya pagada, con la fecha del pago.
  const p3 = await registrarPago(u, { clientId, monto: 150, fecha: "2026-10-01", metodo: "yappy" });
  const f3 = await prisma.document.findUniqueOrThrow({ where: { id: p3.documentId! } });
  assert.equal(Number(f3.total), 150);
  assert.equal(f3.status, "PAID");
  assert.equal(f3.issueDate.toISOString().slice(0, 10), "2026-10-01");

  // Las dos quedan en la cuenta del cliente (lo mismo que lee /cliente/facturas).
  const portal = await facturasDelCliente(clientId);
  assert.deepEqual(portal.facturas.map((f) => f.id).sort(), [f1.id, f3.id].sort());
  // Por cobrar: fase 3 por su factura (2000 − 800) + fase 4 sin factura (800); el pago aparte ya está saldado.
  ficha = await fichaCliente(u.id, clientId);
  assert.equal(ficha?.saldo.pendiente, 2000);

  // Pagos viejos sin factura: se facturan una sola vez.
  const viejo = await prisma.payment.create({ data: { userId: u.id, clientId, phaseId: fase4.id, amount: 100, paidAt: new Date("2026-07-15T12:00:00Z"), method: "otro", status: "confirmado" } });
  const suelto = await prisma.payment.create({ data: { userId: u.id, clientId, amount: 75, paidAt: new Date("2026-07-20T12:00:00Z"), method: "otro", status: "confirmado" } });
  const r = await facturarPagosSinFactura(u, [viejo.id, suelto.id]);
  assert.equal(r.length, 2);
  const fv = await prisma.document.findUniqueOrThrow({ where: { id: r[0].facturaId } });
  assert.equal(Number(fv.total), 800, "el pago de la fase 4 emite la factura de la fase");
  const fs = await prisma.document.findUniqueOrThrow({ where: { id: r[1].facturaId } });
  assert.equal(Number(fs.total), 75);
  assert.equal(fs.status, "PAID");
  assert.equal(fs.issueDate.toISOString().slice(0, 10), "2026-07-20");
  assert.deepEqual(await facturarPagosSinFactura(u, [viejo.id, suelto.id]), [], "no se factura dos veces");

  // Deshacer el pago aparte borra su factura; deshacer uno de la fase deja la factura con el otro.
  assert.deepEqual(await borrarPago(u.id, p3.id), { facturaBorrada: true, documentId: f3.id });
  assert.equal(await prisma.document.count({ where: { id: f3.id } }), 0);
  assert.equal((await borrarPago(u.id, p2.id)).facturaBorrada, false);
  assert.equal(Number((await prisma.document.findUniqueOrThrow({ where: { id: f1.id } })).amountPaid), 300);
  assert.equal((await borrarPago(u.id, p1.id)).facturaBorrada, true, "sin pagos, la factura que nació por un pago se va");
  assert.equal((await prisma.projectPhase.findUniqueOrThrow({ where: { id: fase.id } })).invoiceId, null);
});
