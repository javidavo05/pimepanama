/**
 * Recibo de cada pago. Una fase o un proyecto llevan UNA factura por su precio y los pagos se abonan a ella;
 * cada abono tiene su recibo descargable con lo pagado hasta ese día y lo que queda.
 */
import { Readable } from "stream";
import { renderToStream, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement, JSXElementConstructor } from "react";
import { prisma } from "@/lib/prisma";
import { getLogoForPdf } from "@/lib/pdf/logo-loader";

const r2 = (n: number) => Math.round(n * 100) / 100;

export type DatosRecibo = Awaited<ReturnType<typeof datosRecibo>>;

/** Número del recibo: el de la factura y el orden del abono (FAC-2026-0017-R2). Sin factura: R- y el id corto. */
export function numeroRecibo(factura: string | null, orden: number, pagoId: string) {
  return factura ? `${factura}-R${orden}` : `R-${pagoId.slice(-6).toUpperCase()}`;
}

export async function datosRecibo(pagoId: string, where: { userId?: string; clientId?: string }) {
  const pago = await prisma.payment.findFirst({
    where: { id: pagoId, status: "confirmado", ...where },
    include: { client: true, document: { select: { id: true, number: true, title: true, total: true, currency: true, language: true, userId: true } } },
  });
  if (!pago) return null;
  // Abonos de la misma factura, por fecha: el orden da el número y el acumulado.
  const hermanos = pago.documentId
    ? await prisma.payment.findMany({ where: { documentId: pago.documentId, status: "confirmado" }, orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }], select: { id: true, amount: true } })
    : [{ id: pago.id, amount: pago.amount }];
  const i = Math.max(0, hermanos.findIndex((h) => h.id === pago.id));
  const pagadoHasta = r2(hermanos.slice(0, i + 1).reduce((a, h) => a + Number(h.amount), 0));
  const total = pago.document ? Number(pago.document.total ?? 0) : Number(pago.amount);
  const company = await prisma.companyConfig.findFirst({ where: { users: { some: { id: pago.userId } } } });
  return {
    numero: numeroRecibo(pago.document?.number ?? null, i + 1, pago.id),
    // paidAt es una fecha sin hora (medianoche UTC): al mediodía no cambia de día en ninguna zona.
    pago: { id: pago.id, monto: Number(pago.amount), fecha: new Date(`${pago.paidAt.toISOString().slice(0, 10)}T12:00:00Z`), metodo: pago.method, referencia: pago.reference },
    cliente: pago.client,
    factura: pago.document ? { numero: pago.document.number, concepto: pago.document.title, total } : null,
    pagadoHasta,
    saldo: r2(Math.max(0, total - pagadoHasta)),
    moneda: pago.document?.currency ?? "USD",
    lang: (pago.document?.language === "en" ? "en" : "es") as "es" | "en",
    company,
  };
}

type PdfElement = ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;

export async function respuestaRecibo(d: NonNullable<DatosRecibo>, inline: boolean) {
  const logoSrc = await getLogoForPdf(d.company);
  const { ReciboPdf } = await import("@/lib/pdf/templates/recibo-pdf");
  const stream = await renderToStream(ReciboPdf({ d, logoSrc }) as PdfElement);
  const nombre = `${d.numero}.pdf`.replace(/\s+/g, "-").replace(/[^\w.-]/g, "");
  return new Response(Readable.toWeb(stream as Readable) as ReadableStream, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${nombre}"`, "Cache-Control": "private, no-cache" },
  });
}
