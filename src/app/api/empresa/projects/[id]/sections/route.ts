import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const project = await prisma.project.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await request.json();
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

    const last = await prisma.projectSection.findFirst({
      where: { projectId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const section = await prisma.projectSection.create({
      data: { projectId: id, name, sortOrder: (last?.sortOrder ?? 0) + 1 },
      select: { id: true, name: true, sortOrder: true },
    });
    return NextResponse.json(section, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
