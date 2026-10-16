import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { puedeVer } from "@/lib/auth/permisos";

export const runtime = "nodejs";

/**
 * Buscador de vínculos de una tarea: ?tipo=cliente|lead|oportunidad&q=texto. Devuelve hasta 8 resultados
 * { id, nombre, detalle }. Los leads y oportunidades solo los ven las áreas que tienen esas secciones.
 */
export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const q = (searchParams.get("q") ?? "").trim().slice(0, 80);
    const texto = q ? { contains: q, mode: "insensitive" as const } : undefined;
    const area = user.miembro.area;

    if (tipo === "cliente") {
      const filas = await prisma.client.findMany({
        where: { userId: user.id, archivedAt: null, ...(texto ? { OR: [{ name: texto }, { company: texto }, { email: texto }] } : {}) },
        select: { id: true, name: true, company: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      });
      return NextResponse.json(filas.map((c) => ({ id: c.id, nombre: c.company || c.name, detalle: c.company ? c.name : null })));
    }
    if (tipo === "lead") {
      if (!puedeVer(area, "leads")) return NextResponse.json({ error: "Tu área no ve los leads." }, { status: 403 });
      const filas = await prisma.lead.findMany({
        where: { userId: user.id, status: { notIn: ["GANADO", "PERDIDO"] }, ...(texto ? { OR: [{ name: texto }, { company: texto }, { email: texto }] } : {}) },
        select: { id: true, name: true, company: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      });
      return NextResponse.json(filas.map((l) => ({ id: l.id, nombre: l.name, detalle: l.company })));
    }
    if (tipo === "oportunidad") {
      if (!puedeVer(area, "ventas")) return NextResponse.json({ error: "Tu área no ve el embudo de ventas." }, { status: 403 });
      const filas = await prisma.oportunidad.findMany({
        where: { userId: user.id, estado: "abierta", ...(texto ? { titulo: texto } : {}) },
        select: { id: true, titulo: true, client: { select: { name: true, company: true } }, lead: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 8,
      });
      return NextResponse.json(filas.map((o) => ({ id: o.id, nombre: o.titulo, detalle: o.client ? o.client.company || o.client.name : o.lead?.name ?? null })));
    }
    return NextResponse.json({ error: "Tipo de búsqueda no válido" }, { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
