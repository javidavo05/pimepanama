import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { prisma } from "@/lib/prisma";
import { direccionesDelFeed, eventosParaGoogle, nuevoToken } from "@/lib/calendario/exportar";

export const runtime = "nodejs";

/** Pime en Google Calendar: estado, crear o cambiar la dirección (revoca la anterior) y quitarla. */
async function estado(userId: string, token: string | null) {
  if (!token) return { activo: false as const };
  const eventos = await eventosParaGoogle(userId);
  const ahora = Date.now();
  return { activo: true as const, ...direccionesDelFeed(token), proximos: eventos.filter((e) => e.inicio.getTime() >= ahora - 86_400_000).length };
}

export const GET = withEmpresaRoute(async (request) => {
  const u = await requireEmpresaUser(request);
  const x = await prisma.empresaUser.findUnique({ where: { id: u.id }, select: { calendarFeedToken: true } });
  return NextResponse.json(await estado(u.id, x?.calendarFeedToken ?? null));
});

export const POST = withEmpresaRoute(async (request) => {
  const u = await requireEmpresaUser(request);
  const { cambiar } = (await request.json().catch(() => ({}))) as { cambiar?: boolean };
  const x = await prisma.empresaUser.findUnique({ where: { id: u.id }, select: { calendarFeedToken: true } });
  let token = x?.calendarFeedToken ?? null;
  if (!token || cambiar) {
    token = nuevoToken();
    await prisma.empresaUser.update({ where: { id: u.id }, data: { calendarFeedToken: token } });
  }
  return NextResponse.json(await estado(u.id, token));
});

export const DELETE = withEmpresaRoute(async (request) => {
  const u = await requireEmpresaUser(request);
  await prisma.empresaUser.update({ where: { id: u.id }, data: { calendarFeedToken: null } });
  return NextResponse.json({ activo: false });
});
