import { NextResponse } from "next/server";
import { Readable } from "stream";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { renderDocumentPdf } from "@/lib/pdf/render";
import { resolveDocumentPdfPaymentMethods } from "@/lib/pdf/payment-methods";
import { opcionesPdfDocumento } from "@/lib/pdf/datos-linea";

export const runtime = "nodejs";

/** PDF de una factura para la persona del cliente dueño de esa factura. Borradores y canceladas no salen. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return NextResponse.json({ error: "Tu sesión venció." }, { status: 401 });
  const persona = await prisma.clientUser.findUnique({ where: { supabaseUid: uid }, select: { clientId: true, status: true } });
  if (!persona || persona.status !== "activo") return NextResponse.json({ error: "Sin acceso." }, { status: 403 });

  const doc = await prisma.document.findFirst({ where: { id, clientId: persona.clientId, type: "FACTURA", status: { notIn: ["DRAFT", "CANCELLED"] } } });
  if (!doc) return NextResponse.json({ error: "No encontramos esa factura." }, { status: 404 });
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
