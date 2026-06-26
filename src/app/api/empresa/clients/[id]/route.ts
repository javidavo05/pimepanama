import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.client.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = await request.json();
    const client = await prisma.client.update({ where: { id }, data });
    return NextResponse.json(client);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.client.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
