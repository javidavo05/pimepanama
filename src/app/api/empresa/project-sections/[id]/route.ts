import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function findOwned(id: string, userId: string) {
  return prisma.projectSection.findFirst({ where: { id, project: { userId } }, select: { id: true } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    if (!(await findOwned(id, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await request.json();
    const update: { name?: string; sortOrder?: number } = {};
    if (typeof data.name === "string") {
      if (!data.name.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
      update.name = data.name.trim();
    }
    if (typeof data.sortOrder === "number") update.sortOrder = data.sortOrder;

    const section = await prisma.projectSection.update({
      where: { id },
      data: update,
      select: { id: true, name: true, sortOrder: true },
    });
    return NextResponse.json(section);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

/** Borra la sección; sus tareas quedan en el proyecto, sin sección. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    if (!(await findOwned(id, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.projectSection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
