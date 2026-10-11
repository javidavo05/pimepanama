import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

/**
 * Logo de firma de correo — público, sin auth (para clientes de email externos).
 * Desde la marca «Capas abiertas» (2026-10-11) sirve el PNG de la marca nueva que vive en el repo, en vez del
 * archivo viejo guardado en R2. Las firmas nuevas apuntan directo a /brand/pime-normal-correo-v2.png; esta ruta
 * queda para correos enviados antes y para CompanyConfig.logoUrl, que todavía la nombra.
 */
export async function GET() {
  try {
    const body = await readFile(join(process.cwd(), "public", "brand", "pime-normal-correo-v2.png"));
    return new NextResponse(new Uint8Array(body), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.redirect(new URL("/logo-pime.png", process.env.NEXT_PUBLIC_SITE_URL ?? "https://pimepanama.com"));
  }
}
