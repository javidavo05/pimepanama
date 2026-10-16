import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { generatePresignedUploadUrl } from "@/lib/r2";
import { personaDeApi } from "@/lib/portal/datos";
import { archivoValido, carpetaArchivos, nombreSeguro } from "@/lib/portal/documentos";

export const runtime = "nodejs";

/**
 * Enlace firmado para que el navegador suba un archivo de hasta 20 MB directo a R2 (Vercel corta los pedidos
 * de más de 4.5 MB). Después el formulario lo registra con registrarArchivoAction, que comprueba el tamaño real.
 */
export async function POST(request: Request) {
  const persona = await personaDeApi();
  if (!persona) return NextResponse.json({ error: "Tu sesión venció. Vuelve a entrar." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { nombre?: unknown; tipo?: unknown; tamano?: unknown } | null;
  const nombre = String(body?.nombre ?? "").slice(0, 200);
  const tamano = Number(body?.tamano ?? 0);
  const tipo = String(body?.tipo ?? "") || "application/octet-stream";
  const invalido = archivoValido({ nombre, tamano });
  if (invalido) return NextResponse.json({ error: invalido }, { status: 400 });
  const key = `${carpetaArchivos(persona.clientId)}${new Date().toISOString().slice(0, 7)}/${randomUUID()}-${nombreSeguro(nombre)}`;
  try {
    const url = await generatePresignedUploadUrl(key, tipo);
    return NextResponse.json({ url, key, tipo });
  } catch {
    return NextResponse.json({ error: "No pudimos preparar la subida. Inténtalo en un momento." }, { status: 500 });
  }
}
