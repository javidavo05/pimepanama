import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { datosRecibo, respuestaRecibo } from "@/lib/pagos/recibo";

export const runtime = "nodejs";

/** Recibo en PDF de un pago confirmado. ?ver=1 lo abre en vez de descargarlo. */
export const GET = withEmpresaIdRoute(async (request, { params }) => {
  const user = await requireEmpresaUser(request);
  const { id } = await params;
  const d = await datosRecibo(id, { userId: user.id });
  if (!d) return NextResponse.json({ error: "No encontré ese pago." }, { status: 404 });
  return respuestaRecibo(d, new URL(request.url).searchParams.get("ver") === "1");
});
