import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await request.json();
    const update: Record<string, unknown> = { ...data };
    if ("dueDate" in update) {
      update.dueDate = update.dueDate ? new Date(update.dueDate as string) : null;
    }
    if ("endDate" in update) {
      update.endDate = update.endDate ? new Date(update.endDate as string) : null;
    }
    if ("completed" in update) {
      if (update.completed && !existing.completed) update.completedAt = new Date();
      if (!update.completed) update.completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: update,
      include: {
        document: { select: { id: true, type: true, number: true, clientName: true, clientCompany: true } },
        paymentSchedule: { select: { id: true, description: true, documentId: true } },
      },
    });

    return NextResponse.json(task);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
