import { NextResponse } from "next/server";
import { personaDeApi } from "@/lib/portal/datos";
import { datosRecibo, respuestaRecibo } from "@/lib/pagos/recibo";

export const runtime = "nodejs";

/** Recibo en PDF de un pago confirmado, para la persona del cliente dueño de ese pago. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await personaDeApi();
  if (!persona) return NextResponse.json({ error: "Tu sesión venció. Vuelve a entrar." }, { status: 401 });
  const d = await datosRecibo(id, { clientId: persona.clientId });
  if (!d) return NextResponse.json({ error: "No encontramos ese pago." }, { status: 404 });
  return respuestaRecibo(d, new URL(request.url).searchParams.get("ver") === "1");
}
