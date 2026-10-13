/**
 * De dónde sale la línea de marca de cada PDF (consultas). La regla en sí es pura y vive en linea.ts.
 * - Documento (factura, cotización, bitácora, correo): el cliente del documento (Document.clientId).
 * - Contrato y propuesta: el cliente del contrato y todos los clientes del proyecto; si uno es premium, premium.
 * - Sin cliente: normal.
 */
import { prisma } from "@/lib/prisma";
import { lineaDe, lineaDeClientes, type PdfLinea } from "./linea";
import type { AbonoPdf } from "./components/abonos-table";

/** Línea de un cliente por id, dentro del tenant. Sin id: normal, sin consultar. */
export async function lineaDeClienteId(clientId: string | null | undefined, userId?: string): Promise<PdfLinea> {
  if (!clientId) return "normal";
  const c = await prisma.client.findFirst({ where: { id: clientId, ...(userId ? { userId } : {}) }, select: { brandLine: true } });
  return lineaDe(c);
}

/** Línea de un proyecto: premium si alguno de sus clientes (o de los `extra`) es premium. */
export async function lineaDeProyecto(projectId: string | null | undefined, extra: { brandLine?: string | null }[] = []): Promise<PdfLinea> {
  if (lineaDeClientes(extra) === "premium" || !projectId) return lineaDeClientes(extra);
  const premium = await prisma.client.findFirst({
    where: { brandLine: "premium", OR: [{ projects: { some: { id: projectId } } }, { projectLinks: { some: { projectId } } }] },
    select: { brandLine: true },
  });
  return lineaDe(premium);
}

/** Abonos confirmados a una factura, en orden, como van en el PDF. */
export async function abonosDeFactura(documentId: string): Promise<AbonoPdf[]> {
  const pagos = await prisma.payment.findMany({
    where: { documentId, status: "confirmado" },
    orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    select: { amount: true, paidAt: true, method: true, reference: true },
  });
  // paidAt es una fecha sin hora (medianoche UTC): al mediodía no cambia de día en ninguna zona.
  return pagos.map((p) => ({
    fecha: new Date(`${p.paidAt.toISOString().slice(0, 10)}T12:00:00Z`),
    metodo: p.method,
    referencia: p.reference,
    monto: Number(p.amount),
  }));
}

/** Todo lo que un documento necesita además de sí mismo para su PDF: su línea y, si es factura, sus abonos. */
export async function opcionesPdfDocumento(doc: { id: string; type: string; clientId: string | null; userId: string }) {
  const [linea, abonos] = await Promise.all([
    lineaDeClienteId(doc.clientId, doc.userId),
    doc.type === "FACTURA" ? abonosDeFactura(doc.id) : Promise.resolve([] as AbonoPdf[]),
  ]);
  return { linea, abonos };
}
