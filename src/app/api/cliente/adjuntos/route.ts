import { NextResponse } from "next/server";
import { personaDeApi } from "@/lib/portal/datos";
import { SOLO_LECTURA } from "@/lib/portal/vista";
import { putR2Object } from "@/lib/r2";
import { MAX_BYTES, TIPOS_PERMITIDOS, llaveNueva } from "@/lib/portal/adjuntos";

export const runtime = "nodejs";

/** Sube un archivo de la cuenta del cliente a R2 y devuelve su llave. Un archivo por pedido. */
export async function POST(request: Request) {
  const persona = await personaDeApi();
  if (!persona) return NextResponse.json({ error: "Tu sesión venció. Vuelve a entrar." }, { status: 401 });
  if (persona.vista) return NextResponse.json({ error: SOLO_LECTURA }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("archivo");
  if (!(file instanceof File)) return NextResponse.json({ error: "No llegó ningún archivo." }, { status: 400 });
  if (!(TIPOS_PERMITIDOS as readonly string[]).includes(file.type)) return NextResponse.json({ error: "Solo imágenes (PNG, JPG, WebP, GIF, HEIC) o PDF." }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "El archivo pasa de 4 MB." }, { status: 413 });

  const key = llaveNueva(persona.clientId, file.name);
  await putR2Object(key, Buffer.from(await file.arrayBuffer()), file.type);
  return NextResponse.json({ key, fileName: file.name, contentType: file.type, sizeBytes: file.size });
}
