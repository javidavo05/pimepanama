import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { r2, R2_BUCKET } from "@/lib/r2";
import { personaDeApi } from "@/lib/portal/datos";
import { irA } from "@/lib/portal/vista";

export const runtime = "nodejs";

/** Descarga un archivo compartido: enlace firmado de 5 minutos, solo si es de este cliente y está visible. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await personaDeApi();
  if (!persona) return irA("/cliente/acceso");
  const a = await prisma.archivoCliente.findFirst({ where: { id, clientId: persona.clientId, visibleCliente: true }, select: { r2Key: true, nombre: true } });
  if (!a) return irA("/cliente/archivos?aviso=archivo-no-disponible");
  const url = await getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: a.r2Key, ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(a.nombre)}` }), { expiresIn: 300 });
  return NextResponse.redirect(url, 303);
}
