import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { personaDeApi } from "@/lib/portal/datos";
import { esperaMiFirma } from "@/lib/portal/documentos";
import { signingTokenSecret } from "@/lib/pimesign/config";
import { generateSigningToken, hashSigningToken } from "@/lib/pimesign/tokens";
import { logSigningEvent } from "@/lib/pimesign/workflow";

export const runtime = "nodejs";

/**
 * Lleva a la persona a firmar su contrato desde su cuenta. Los enlaces del correo se guardan cifrados (no se
 * pueden recuperar), así que se emite un enlace nuevo de firma del cliente con el mismo vencimiento del proceso
 * y se redirige a /firmar/<token>. Solo para la persona a quien Pime le mandó el contrato a firmar.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const volver = (aviso: string) => NextResponse.redirect(new URL(`/cliente/contratos?aviso=${aviso}`, request.url), 303);
  const persona = await personaDeApi();
  if (!persona) return NextResponse.redirect(new URL("/cliente/acceso", request.url), 303);

  const c = await prisma.contract.findFirst({ where: { id, clientId: persona.clientId }, select: { status: true, signingStatus: true, signingRequest: { select: { id: true, status: true, clientEmail: true, expiresAt: true } } } });
  const req = c?.signingRequest;
  if (!c || !req || req.status !== "PENDING_CLIENT") return volver("firma-no-pendiente");
  if (!esperaMiFirma({ ...c, clientEmail: req.clientEmail }, persona.email)) return volver("firma-de-otra-persona");
  if (req.expiresAt < new Date()) return volver("firma-vencida");

  const raw = generateSigningToken();
  await prisma.contractSigningToken.create({ data: { requestId: req.id, role: "CLIENT", tokenHash: hashSigningToken(raw, signingTokenSecret()), expiresAt: req.expiresAt } });
  await logSigningEvent(req.id, "LINK_FROM_PORTAL", { actorEmail: persona.email, ipAddress: (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined, userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? undefined }).catch(() => {});
  return NextResponse.redirect(new URL(`/firmar/${raw}`, request.url), 303);
}
