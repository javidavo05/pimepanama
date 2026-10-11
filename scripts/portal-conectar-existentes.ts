/**
 * Conecta lo que ya existía antes de Pime Clientes (fase 9). No envía correos ni invitaciones.
 *
 *   node --env-file=.env.local --import tsx scripts/portal-conectar-existentes.ts            → solo muestra
 *   node --env-file=.env.local --import tsx scripts/portal-conectar-existentes.ts --aplicar  → escribe
 *
 * Qué hace:
 *  1. Pagos viejos a filas: cada factura cuyo pago vive solo en Document.amountPaid (o marcada PAID sin
 *     monto) recibe una fila en Payment por la diferencia, como «Pago registrado antes del portal».
 *  2. Informe de lo que falta decidir por cliente: correo para invitar, proyectos sin fases y facturas
 *     sin proyecto. Eso lo decide una persona; el script no lo inventa.
 * Idempotente: correrlo dos veces no duplica pagos.
 */
import { PrismaClient } from "@prisma/client";
import { saldoCliente } from "../src/lib/portal/saldo";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");
const usd = (n: number) => `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function main() {
  const facturas = await prisma.document.findMany({
    where: { type: "FACTURA", status: { notIn: ["DRAFT", "CANCELLED"] }, client: { NOT: { name: { startsWith: "[prueba]" } } } },
    select: { id: true, userId: true, clientId: true, number: true, status: true, total: true, amountPaid: true, updatedAt: true, payments: { where: { status: "confirmado" }, select: { amount: true } } },
  });
  let migrados = 0, monto = 0;
  console.log(`\n1) Pagos viejos a filas ${aplicar ? "(APLICANDO)" : "(solo revisión)"}`);
  for (const f of facturas) {
    const enFilas = f.payments.reduce((a, p) => a + Number(p.amount), 0);
    const pagado = f.status === "PAID" ? Math.max(Number(f.total ?? 0), Number(f.amountPaid ?? 0)) : Number(f.amountPaid ?? 0);
    const falta = Math.round((pagado - enFilas) * 100) / 100;
    if (falta <= 0.005) continue;
    console.log(`   ${f.number} · ${usd(falta)}${f.status === "PAID" && !Number(f.amountPaid) ? " (marcada pagada sin monto)" : ""}`);
    migrados++; monto += falta;
    if (aplicar) await prisma.payment.create({ data: { userId: f.userId, clientId: f.clientId, documentId: f.id, amount: falta, paidAt: f.updatedAt, method: "otro", status: "confirmado", note: "Pago registrado antes del portal", confirmedAt: new Date() } });
  }
  console.log(`   ${migrados} factura(s), ${usd(monto)} en total${aplicar ? " pasados a filas" : ""}.`);

  console.log("\n2) Lo que falta decidir por cliente (con proyecto en curso o saldo)");
  const clientes = await prisma.client.findMany({
    where: { archivedAt: null, NOT: { name: { startsWith: "[prueba]" } } },
    select: { id: true, name: true, company: true, email: true, brandLine: true, portalUsers: { select: { status: true } },
      documents: { where: { type: "FACTURA" }, select: { id: true, number: true, status: true, total: true, amountPaid: true, projectId: true } },
      payments: { select: { documentId: true, amount: true, status: true } },
      projects: { where: { status: "ACTIVE" }, select: { id: true, name: true, _count: { select: { phases: true } } } } },
    orderBy: { name: "asc" },
  });
  for (const c of clientes) {
    const s = saldoCliente(c.documents, c.payments);
    if (!c.projects.length && s.pendiente <= 0.005) continue;
    const faltas = [
      !c.email ? "sin correo para invitar" : c.portalUsers.length ? null : "correo listo, sin invitar",
      ...c.projects.filter((p) => !p._count.phases).map((p) => `proyecto «${p.name}» sin fases`),
      c.documents.some((d) => !d.projectId) && c.projects.length ? `${c.documents.filter((d) => !d.projectId).length} factura(s) sin proyecto` : null,
    ].filter(Boolean);
    console.log(`   ${c.company || c.name} · ${c.brandLine} · por cobrar ${usd(s.pendiente)}\n      ${faltas.join(" · ") || "todo listo"}`);
  }
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
