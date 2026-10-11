/**
 * Puente entre los cobros de siempre de /empresa (que suben Document.amountPaid) y la tabla Payment
 * (un pago por fila, lo que ve el cliente). Después de cada cobro o reversa, las filas confirmadas de
 * la factura suman lo mismo que amountPaid:
 *   - si falta, se agrega una fila con la diferencia;
 *   - si sobra (se deshizo un cobro), las filas más nuevas pasan a «rechazado».
 * Idempotente: correrlo dos veces no cambia nada.
 */
import { prisma } from "@/lib/prisma";

const r2 = (x: number) => Math.round(x * 100) / 100;

export async function sincronizarPagosDeFactura(documentId: string, nota = "Registrado desde /empresa"): Promise<void> {
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId }, select: { id: true, type: true, userId: true, clientId: true, amountPaid: true } });
    if (!doc || doc.type !== "FACTURA") return;
    const objetivo = r2(Number(doc.amountPaid ?? 0));
    const filas = await prisma.payment.findMany({ where: { documentId, status: "confirmado" }, orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }], select: { id: true, amount: true } });
    let suma = r2(filas.reduce((a, f) => a + Number(f.amount), 0));
    if (objetivo > suma + 0.005) {
      await prisma.payment.create({ data: { userId: doc.userId, clientId: doc.clientId, documentId, amount: r2(objetivo - suma), method: "otro", status: "confirmado", note: nota, confirmedAt: new Date() } });
      return;
    }
    for (const f of filas) {
      if (suma <= objetivo + 0.005) break;
      await prisma.payment.update({ where: { id: f.id }, data: { status: "rechazado", note: "Cobro deshecho en /empresa" } });
      suma = r2(suma - Number(f.amount));
    }
    if (objetivo > suma + 0.005) {
      await prisma.payment.create({ data: { userId: doc.userId, clientId: doc.clientId, documentId, amount: r2(objetivo - suma), method: "otro", status: "confirmado", note: nota, confirmedAt: new Date() } });
    }
  } catch (e) {
    console.error("[pagos] sincronizar", documentId, e);
  }
}
