import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { eventosDelEquipo } from "@/lib/calendario/datos";

/** Eventos de tu Google Calendar en un rango (para la agenda de Tareas). Solo lectura. */
export const runtime = "nodejs";
const MAX_DIAS = 62;

export async function GET(request: Request) {
  try {
    const u = await requireEmpresaUser(request);
    const q = new URL(request.url).searchParams;
    const desde = new Date(q.get("desde") ?? ""), hasta = new Date(q.get("hasta") ?? "");
    if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || hasta <= desde) return NextResponse.json({ error: "Rango de fechas inválido." }, { status: 400 });
    if (hasta.getTime() - desde.getTime() > MAX_DIAS * 86_400_000) return NextResponse.json({ error: `El rango no puede pasar de ${MAX_DIAS} días.` }, { status: 400 });
    const r = await eventosDelEquipo(u.id, desde, hasta);
    return NextResponse.json({
      estado: r.estado,
      error: r.error ?? null,
      eventos: r.eventos.map((e) => ({ id: e.id, titulo: e.titulo, inicio: e.inicio.toISOString(), fin: e.fin?.toISOString() ?? null, todoElDia: e.todoElDia, lugar: e.lugar, enlace: e.enlace })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "No se pudo leer tu Google Calendar." }, { status: 500 });
  }
}
