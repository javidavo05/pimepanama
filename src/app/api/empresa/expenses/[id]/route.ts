import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.expense.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await request.json();
    const update: Record<string, unknown> = {};

    if (data.title !== undefined) update.title = data.title;
    if (data.category !== undefined) update.category = data.category;
    if (data.amount !== undefined) update.amount = data.amount;
    if (data.currency !== undefined) update.currency = data.currency;
    if (data.dueDate !== undefined) update.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.isRecurring !== undefined) update.isRecurring = Boolean(data.isRecurring);
    if (data.vendor !== undefined) update.vendor = data.vendor;
    if (data.notes !== undefined) update.notes = data.notes;

    if (data.status !== undefined) {
      update.status = data.status;
      if (data.status === "PAID" && !data.paidAt && !existing.paidAt) {
        update.paidAt = new Date();
      }
      if (data.status === "PENDING") {
        update.paidAt = null;
      }
    }
    if (data.paidAt !== undefined) {
      update.paidAt = data.paidAt ? new Date(data.paidAt) : null;
    }

    const expense = await prisma.expense.update({ where: { id }, data: update });
    return NextResponse.json(expense);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.expense.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
