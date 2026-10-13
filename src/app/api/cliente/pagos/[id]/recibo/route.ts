import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { datosRecibo, respuestaRecibo } from "@/lib/pagos/recibo";

export const runtime = "nodejs";

/** Recibo en PDF de un pago confirmado, para la persona del cliente dueño de ese pago. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return NextResponse.json({ error: "Tu sesión venció." }, { status: 401 });
  const persona = await prisma.clientUser.findUnique({ where: { supabaseUid: uid }, select: { clientId: true, status: true } });
  if (!persona || persona.status !== "activo") return NextResponse.json({ error: "Sin acceso." }, { status: 403 });
  const d = await datosRecibo(id, { clientId: persona.clientId });
  if (!d) return NextResponse.json({ error: "No encontramos ese pago." }, { status: 404 });
  return respuestaRecibo(d, new URL(request.url).searchParams.get("ver") === "1");
}
