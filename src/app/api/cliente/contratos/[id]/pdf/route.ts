import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getR2Object } from "@/lib/r2";
import { personaDeApi } from "@/lib/portal/datos";
import { contratoVisible } from "@/lib/portal/documentos";

export const runtime = "nodejs";

/**
 * PDF de un contrato del cliente: el firmado por las dos partes si existe; si todavía está en firma, el que se
 * mandó a firmar (sin firmas). Los borradores internos no salen.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await personaDeApi();
  if (!persona) return NextResponse.json({ error: "Tu sesión venció. Vuelve a entrar." }, { status: 401 });

  const c = await prisma.contract.findFirst({ where: { id, clientId: persona.clientId }, select: { title: true, status: true, signingStatus: true, signingRequest: { select: { signedPdfR2Key: true, basePdfR2Key: true } } } });
  if (!c || !contratoVisible(c)) return NextResponse.json({ error: "No encontramos ese contrato." }, { status: 404 });
  const key = c.signingRequest?.signedPdfR2Key || c.signingRequest?.basePdfR2Key;
  if (!key) return NextResponse.json({ error: "Este contrato todavía no tiene PDF." }, { status: 404 });

  const obj = await getR2Object(key).catch(() => null);
  const body = await obj?.Body?.transformToByteArray();
  if (!body) return NextResponse.json({ error: "El PDF no está disponible. Escríbenos y te lo mandamos." }, { status: 404 });
  const firmado = !!c.signingRequest?.signedPdfR2Key;
  const nombre = `${c.title}${firmado ? "-firmado" : ""}.pdf`.normalize("NFKD").replace(/\s+/g, "-").replace(/[^\w.-]/g, "");
  return new NextResponse(new Uint8Array(body), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `${new URL(request.url).searchParams.get("ver") ? "inline" : "attachment"}; filename="${nombre}"`, "Cache-Control": "private, no-cache", "X-Content-Type-Options": "nosniff" },
  });
}
