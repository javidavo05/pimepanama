import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getR2Object } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * Descarga un adjunto de ticket. Lo puede ver la persona del cliente dueño del ticket o el equipo
 * Pime dueño de la cuenta. Las notas internas y sus archivos nunca salen hacia el cliente.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const adj = await prisma.ticketAttachment.findUnique({ where: { id }, select: { r2Key: true, fileName: true, contentType: true, ticket: { select: { clientId: true, userId: true } }, message: { select: { internal: true } } } });
  if (!adj) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const [persona, equipo] = await Promise.all([
    prisma.clientUser.findUnique({ where: { supabaseUid: uid }, select: { clientId: true, status: true } }),
    prisma.empresaUser.findUnique({ where: { supabaseUid: uid }, select: { id: true } }),
  ]);
  const esCliente = persona?.status === "activo" && persona.clientId === adj.ticket.clientId && !adj.message?.internal;
  const esEquipo = equipo?.id === adj.ticket.userId;
  if (!esCliente && !esEquipo) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const obj = await getR2Object(adj.r2Key);
  const body = await obj.Body?.transformToByteArray();
  if (!body) return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": adj.contentType,
      "Content-Disposition": `${adj.contentType.startsWith("image/") ? "inline" : "attachment"}; filename="${encodeURIComponent(adj.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
