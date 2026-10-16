/**
 * Píxel de apertura de las campañas: `<img src="/api/c/abrir/<envioId>.gif">`. Pública (la abre el programa de
 * correo del destinatario, sin sesión). Marca el envío como abierto una sola vez y suma a `Campana.abiertos`.
 * Siempre devuelve el GIF, aunque el id no exista o la base falle: un correo nunca muestra una imagen rota.
 */
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function gif() {
  return new Response(new Uint8Array(GIF), {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: crudo } = await params;
  const id = crudo.replace(/\.gif$/i, "").slice(0, 40);
  if (!/^[a-z0-9]+$/i.test(id)) return gif();
  try {
    const envio = await prisma.campanaEnvio.findUnique({ where: { id }, select: { campanaId: true, abiertoAt: true } });
    if (envio && !envio.abiertoAt) {
      // updateMany con abiertoAt: null hace que dos aperturas al mismo tiempo cuenten una sola vez.
      const r = await prisma.campanaEnvio.updateMany({ where: { id, abiertoAt: null }, data: { estado: "abierto", abiertoAt: new Date() } });
      if (r.count) await prisma.campana.update({ where: { id: envio.campanaId }, data: { abiertos: { increment: 1 } } });
    }
  } catch (e) {
    console.error("[campañas] píxel", e);
  }
  return gif();
}
