import { NextResponse } from "next/server";
import { recibirPulso, MAX_CUERPO } from "@/lib/pulso/recibir";

/**
 * POST /api/pulso — los sistemas entregados reportan a Pime (errores, despliegues, latidos, salud).
 * Firma HMAC por sistema; ver src/lib/pulso/firma.ts y packages/pime-pulso.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const largo = Number(request.headers.get("content-length") || 0);
  if (largo > MAX_CUERPO) return NextResponse.json({ outcome: "invalid_payload", reason: "too_large" }, { status: 413 });
  try {
    const r = await recibirPulso(request.headers, await request.text());
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    console.error("[pulso]", e);
    // 500 = el emisor puede reintentar (el id del evento evita duplicarlo).
    return NextResponse.json({ outcome: "error" }, { status: 500 });
  }
}
