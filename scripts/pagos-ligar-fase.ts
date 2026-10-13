/**
 * Pagos registrados antes de la 0051 sin fase ni proyecto: si su factura es la de una fase, el pago queda ligado
 * a esa fase y a su proyecto; si la factura es de un proyecto, al proyecto. Idempotente: solo toca los vacíos.
 *   node --env-file=.env.local --import tsx scripts/pagos-ligar-fase.ts [--solo-revisar]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const soloRevisar = process.argv.includes("--solo-revisar");

(async () => {
  const pagos = await prisma.payment.findMany({
    where: { documentId: { not: null }, phaseId: null },
    select: { id: true, amount: true, paidAt: true, projectId: true, document: { select: { number: true, projectId: true, phasesInvoiced: { select: { id: true, projectId: true }, take: 1 } } } },
  });
  let n = 0;
  for (const p of pagos) {
    const fase = p.document?.phasesInvoiced[0];
    const data = fase ? { phaseId: fase.id, projectId: fase.projectId } : !p.projectId && p.document?.projectId ? { projectId: p.document.projectId } : null;
    if (!data) continue;
    n++;
    console.log(`${soloRevisar ? "·" : "✓"} ${p.document?.number} · ${p.paidAt.toISOString().slice(0, 10)} · ${p.amount} → ${fase ? "fase" : "proyecto"}`);
    if (!soloRevisar) await prisma.payment.update({ where: { id: p.id }, data });
  }
  console.log(`${n} pagos ${soloRevisar ? "por ligar" : "ligados"}.`);
  await prisma.$disconnect();
})();
