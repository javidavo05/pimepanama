import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { emitirPermisoDirecto, ORIGEN_PROYECTO } from "@/lib/directo";

export const runtime = "nodejs";

/** Permiso de 10 minutos para llamar directo al proyecto las rutas que tardan más de 120 s (ver lib/directo). */
export const POST = withEmpresaRoute(async (request) => {
  const user = await requireEmpresaUser(request);
  return NextResponse.json({ origin: ORIGEN_PROYECTO, ...emitirPermisoDirecto(user.supabaseUid) });
});
