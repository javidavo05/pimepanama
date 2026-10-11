import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { conectarCalendario } from "@/lib/calendario/datos";
import { inicioDelDia } from "@/lib/motor/hoy";

/** Google Calendar por dirección secreta iCal. La dirección nunca se devuelve: solo si está conectado. */
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const u = await requireEmpresaUser(request);
    const x = await prisma.empresaUser.findUnique({ where: { id: u.id }, select: { calendarIcsEnc: true, calendarCheckedAt: true, calendarError: true } });
    return NextResponse.json({ conectado: !!x?.calendarIcsEnc, verificado: x?.calendarCheckedAt ?? null, error: x?.calendarError ?? null });
  } catch (e) { if (e instanceof Response) return e; return NextResponse.json({ error: "Error" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const u = await requireEmpresaUser(request);
    const { url } = (await request.json().catch(() => ({}))) as { url?: string };
    const hoy = inicioDelDia();
    const eventos = await conectarCalendario(u.id, String(url ?? ""), hoy, new Date(hoy.getTime() + 86_400_000));
    return NextResponse.json({ ok: true, hoy: eventos.length, primeros: eventos.slice(0, 3).map((e) => e.titulo) });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo conectar el calendario." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const u = await requireEmpresaUser(request);
    await prisma.empresaUser.update({ where: { id: u.id }, data: { calendarIcsEnc: null, calendarCheckedAt: null, calendarError: null } });
    return NextResponse.json({ ok: true });
  } catch (e) { if (e instanceof Response) return e; return NextResponse.json({ error: "Error" }, { status: 500 }); }
}
