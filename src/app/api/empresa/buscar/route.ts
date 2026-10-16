/**
 * Buscador global: GET /api/empresa/buscar?q=…  → resultados agrupados por tipo (pantallas incluidas), solo de los
 * datos de la empresa y de las secciones que el área del miembro puede abrir.
 */
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { agrupar, buscarPantallas } from "@/lib/crm/buscar";
import { buscarEnDatos } from "@/lib/crm/buscar-datos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const u = await requireEmpresaUser(request);
    const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
    if (q.length < 2) return Response.json({ q, grupos: [] });
    const datos = await buscarEnDatos(u.id, u.miembro.area, q);
    const grupos = agrupar([...buscarPantallas(q, u.miembro.area), ...datos]);
    return Response.json({ q, grupos }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[buscar]", err);
    return Response.json({ error: "La búsqueda no respondió. Intenta de nuevo." }, { status: 500 });
  }
}
