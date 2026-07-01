import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { serializeSchedule } from "@/lib/serializers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const existing = await prisma.paymentSchedule.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.status === "PAID") {
    updates.status = "PAID";
    updates.paidAt = new Date();
  } else if (body.status === "CANCELLED") {
    updates.status = "CANCELLED";
  } else if (body.status === "OVERDUE") {
    updates.status = "OVERDUE";
  }

  if (body.description !== undefined) updates.description = body.description;
  if (body.amount !== undefined) updates.amount = body.amount;
  if (body.dueDate !== undefined) updates.dueDate = new Date(body.dueDate);
  if (body.invoiceId !== undefined) updates.invoiceId = body.invoiceId;
  if (body.reminderSent !== undefined) updates.reminderSent = body.reminderSent;

  const schedule = await prisma.paymentSchedule.update({ where: { id }, data: updates });
  return NextResponse.json(serializeSchedule(schedule));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const existing = await prisma.paymentSchedule.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.paymentSchedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
