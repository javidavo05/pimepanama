import { prisma } from "@/lib/prisma";
import { armarIcs, eventosParaGoogle } from "@/lib/calendario/exportar";

export const runtime = "nodejs";

/**
 * La dirección .ics que Google Calendar lee: /api/calendario/<token>.ics. Pública por diseño (Google no
 * manda sesión): la llave es el token, que se cambia desde Configuración para revocarla.
 * Google la vuelve a leer cada varias horas; la CDN la guarda 15 minutos para que no cueste una función
 * por lectura.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await params;
  const token = archivo.replace(/\.ics$/i, "");
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return new Response("No encontrado", { status: 404 });

  const user = await prisma.empresaUser.findUnique({ where: { calendarFeedToken: token }, select: { id: true } });
  if (!user) return new Response("No encontrado", { status: 404 });

  try {
    const ics = armarIcs(await eventosParaGoogle(user.id));
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="pime-suite.ics"',
        "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (e) {
    console.error("[calendario/feed]", e);
    return new Response("No se pudo armar el calendario", { status: 500 });
  }
}
