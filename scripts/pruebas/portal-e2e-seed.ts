/**
 * Siembra un cliente «[prueba]» completo para recorrer el portal. Uso:
 *   node --env-file=.env.local --import tsx scripts/pruebas/portal-e2e-seed.ts crear   → imprime JSON con el enlace
 *   node --env-file=.env.local --import tsx scripts/pruebas/portal-e2e-seed.ts borrar <clientId>
 */
import { PrismaClient } from "@prisma/client";
import { invitarPersona } from "@/lib/portal/invitaciones";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteR2Object, r2, R2_BUCKET } from "@/lib/r2";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();

async function crear() {
  const owner = await prisma.empresaUser.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const c = await prisma.client.create({ data: { userId: owner.id, name: "[prueba] Ana Pérez", company: "[prueba] Distribuidora Ejemplo", email: "delivered@resend.dev", brandLine: process.argv[3] === "normal" ? "normal" : "premium" } });
  const p = await prisma.project.create({ data: { userId: owner.id, clientId: c.id, name: "Plataforma de cobros", description: "Portal de clientes, recordatorios y conciliación con el banco.", kind: "nuevo", status: "ACTIVE", clients: { create: { clientId: c.id } } } });
  await prisma.projectPhase.createMany({ data: [
    { projectId: p.id, sortOrder: 0, name: "Cobro", description: "Portal de clientes, recordatorios y enlace de pago.", price: 6800, billingPoint: "al_aprobar", status: "hecha", progress: 100, startedAt: new Date("2026-08-01"), completedAt: new Date("2026-09-15") },
    { projectId: p.id, sortOrder: 1, name: "Facturación", description: "Plantillas por cliente y emisión electrónica integrada.", price: 4200, billingPoint: "al_entregar", status: "en_curso", progress: 55, startedAt: new Date("2026-09-20"), estimatedDays: 40 },
    { projectId: p.id, sortOrder: 2, name: "Conciliación", description: "Cruce diario con el banco y tablero de pendientes.", price: 5100, billingPoint: "al_entregar", status: "pendiente", estimatedDays: 50 },
  ] });
  const o = await prisma.changeOrder.create({ data: { userId: owner.id, projectId: p.id, clientId: c.id, title: "Filtro por vendedor en el reporte de cobros", description: "Agregar un filtro por vendedor y la exportación a Excel del reporte.", status: "enviada", total: 450, sentAt: new Date(),
    phases: { create: [{ projectId: p.id, name: "Filtro y exportación", price: 450, billingPoint: "al_entregar", estimatedDays: 5 }] } } });
  const f = await prisma.document.create({ data: { userId: owner.id, clientId: c.id, projectId: p.id, type: "FACTURA", status: "PARTIALLY_PAID", number: "PRUEBA-0001", title: "Fase 1 · Cobro", total: 6800, subtotal: 6800, amountPaid: 3400, issueDate: new Date("2026-09-15"), dueDate: new Date("2026-10-15"), clientName: c.name } });
  await prisma.activityEvent.createMany({ data: [
    { userId: owner.id, clientId: c.id, projectId: p.id, entityType: "fase", kind: "fase_hecha", title: "Terminamos la fase Cobro", visibility: "cliente" },
    { userId: owner.id, clientId: c.id, projectId: p.id, entityType: "fase", kind: "avance", title: "Facturación al 55 %", detail: "Plantillas por cliente listas; falta la emisión electrónica.", visibility: "cliente", actorType: "github" },
  ] });
  // La invitación exige una revisión reciente de la cuenta (vista de revisión).
  await prisma.client.update({ where: { id: c.id }, data: { portalReviewedAt: new Date(), portalReviewedBy: "prueba" } });
  const inv = await invitarPersona({ empresaUserId: owner.id, clientId: c.id, email: "delivered@resend.dev", fullName: "Ana Pérez", role: "principal", invitadoPor: "Javier Vallejo" });
  if (!inv.ok) throw new Error(inv.error);
  console.log(JSON.stringify({ clientId: c.id, projectId: p.id, ordenId: o.id, facturaId: f.id, enlace: inv.enlace, enviado: inv.enviado }));
}

async function borrar(clientId: string) {
  const personas = await prisma.clientUser.findMany({ where: { clientId }, select: { supabaseUid: true } });
  const admin = supabaseAdmin();
  for (const p of personas) if (p.supabaseUid) await admin.auth.admin.deleteUser(p.supabaseUid);
  const lista = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: `portal/${clientId}/` }));
  for (const o of lista.Contents ?? []) if (o.Key) await deleteR2Object(o.Key);
  await prisma.payment.deleteMany({ where: { clientId } });
  await prisma.timeEntry.deleteMany({ where: { clientId } });
  await prisma.document.deleteMany({ where: { clientId } });
  await prisma.project.deleteMany({ where: { OR: [{ clientId }, { clients: { some: { clientId } } }] } });
  await prisma.client.delete({ where: { id: clientId } });
  console.log("borrado", clientId, "archivos", lista.KeyCount ?? 0);
}

(process.argv[2] === "borrar" ? borrar(process.argv[3]) : crear()).catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
