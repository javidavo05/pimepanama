import { NextResponse } from "next/server";
import { personaDeApi } from "@/lib/portal/datos";
import { getR2Object } from "@/lib/r2";

export const runtime = "nodejs";

/** Logo de la empresa del cliente con sesión (para su cuenta). Caché privada: cambia poco. */
export async function GET() {
  const persona = await personaDeApi();
  if (!persona) return new NextResponse(null, { status: 401 });
  if (!persona.client.logoKey) return new NextResponse(null, { status: 404 });
  try {
    const o = await getR2Object(persona.client.logoKey);
    const bytes = await o.Body!.transformToByteArray();
    return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": o.ContentType ?? "image/png", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
