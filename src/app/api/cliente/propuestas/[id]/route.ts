import { NextResponse } from "next/server";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { renderDocumentPdf } from "@/lib/pdf/render";
import { resolveDocumentPdfPaymentMethods } from "@/lib/pdf/payment-methods";
import { opcionesPdfDocumento } from "@/lib/pdf/datos-linea";
import { personaDeApi } from "@/lib/portal/datos";

export const runtime = "nodejs";

/** PDF de una propuesta (cotización) para la persona del cliente dueño. Solo las enviadas o aceptadas. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await personaDeApi();
  if (!persona) return NextResponse.json({ error: "Tu sesión venció. Vuelve a entrar." }, { status: 401 });

  const doc = await prisma.document.findFirst({ where: { id, clientId: persona.clientId, type: "COTIZACION", status: { in: ["SENT", "ACCEPTED"] } } });
  if (!doc) return NextResponse.json({ error: "No encontramos esa propuesta." }, { status: 404 });
  const [company, metodos, opciones] = await Promise.all([
    prisma.companyConfig.findFirst({ where: { users: { some: { id: doc.userId } } } }),
    prisma.paymentMethod.findMany({ where: { userId: doc.userId, isActive: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    opcionesPdfDocumento(doc),
  ]);
  const stream = await renderDocumentPdf(doc, company, resolveDocumentPdfPaymentMethods(doc, metodos), opciones);
  const nombre = `${doc.number ?? doc.id}.pdf`.replace(/\s+/g, "-").replace(/[^\w.-]/g, "");
  return new Response(Readable.toWeb(stream as Readable) as ReadableStream, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `${new URL(request.url).searchParams.get("ver") ? "inline" : "attachment"}; filename="${nombre}"`, "Cache-Control": "private, no-cache" },
  });
}
