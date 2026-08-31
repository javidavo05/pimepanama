import { NextResponse, type NextRequest } from "next/server";

/**
 * `requireEmpresaUser` señala "no autenticado" *lanzando* un Response 401. Si el
 * handler no lo atrapa, Next lo trata como excepción y responde 500 — que es lo
 * que hacía parecer caída una ruta que solo estaba protegida. Estos wrappers
 * dejan pasar ese Response tal cual y reservan el 500 para errores de verdad.
 */
function wrap<C>(
  handler: (req: NextRequest, ctx: C) => Promise<Response>
): (req: NextRequest, ctx: C) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof Response) return err;
      console.error(`[${req.method} ${new URL(req.url).pathname}]`, err);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  };
}

/**
 * Rutas de colección: `/api/empresa/algo`. Next exige que el segundo parámetro
 * exista aunque la ruta no tenga segmentos dinámicos, así que se acepta y se
 * ignora.
 */
export function withEmpresaRoute(handler: (req: NextRequest) => Promise<Response>) {
  return wrap<{ params: Promise<Record<string, never>> }>((req) => handler(req));
}

/** Rutas con `[id]`: `/api/empresa/algo/[id]` */
export function withEmpresaIdRoute(
  handler: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>
) {
  return wrap<{ params: Promise<{ id: string }> }>(handler);
}
