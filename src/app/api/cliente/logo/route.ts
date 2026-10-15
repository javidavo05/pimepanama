import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getR2Object } from "@/lib/r2";

export const runtime = "nodejs";

/** Logo de la empresa del cliente con sesión (para su cuenta). Caché privada: cambia poco. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return new NextResponse(null, { status: 401 });
  const persona = await prisma.clientUser.findUnique({ where: { supabaseUid: uid }, select: { status: true, client: { select: { logoKey: true } } } });
  if (!persona || persona.status !== "activo" || !persona.client.logoKey) return new NextResponse(null, { status: 404 });
  try {
    const o = await getR2Object(persona.client.logoKey);
    const bytes = await o.Body!.transformToByteArray();
    return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": o.ContentType ?? "image/png", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
