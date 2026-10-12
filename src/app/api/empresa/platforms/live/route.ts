import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { listaDeCuenta } from "@/lib/platforms/cuentas";

export const runtime = "nodejs";

/**
 * Lista real de una cuenta: repos de GitHub, proyectos de Vercel o de Supabase. Sale de la caché del
 * servidor (30 min); con ?refresh=1 se vuelve a consultar (como mucho una vez por minuto).
 */
export const GET = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const q = new URL(req.url).searchParams;
  const provider = q.get("provider");
  const account = q.get("account") ?? "";
  if (provider !== "github" && provider !== "vercel" && provider !== "supabase") {
    return NextResponse.json({ error: "Proveedor inválido." }, { status: 400 });
  }
  const r = await listaDeCuenta(user.id, provider, account, q.get("refresh") === "1");
  if (!r) return NextResponse.json({ error: "Esa cuenta no tiene token conectado." }, { status: 404 });
  return NextResponse.json({ items: r.data ?? [], fetchedAt: r.fetchedAt, error: r.error, auth: r.auth });
});
