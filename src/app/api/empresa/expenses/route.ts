import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseMonth(month: string | null): { start: Date; end: Date } | null {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const month = searchParams.get("month");
    const projectId = searchParams.get("projectId");
    const range = parseMonth(month);

    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as never } : {}),
        ...(projectId ? { projectId } : {}),
        ...(range
          ? {
              OR: [
                { dueDate: { gte: range.start, lte: range.end } },
                { paidAt: { gte: range.start, lte: range.end } },
                { dueDate: null, createdAt: { gte: range.start, lte: range.end } },
              ],
            }
          : {}),
      },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(expenses);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const data = await request.json();
    const status = data.status ?? "PENDING";
    // El proyecto (producto) del gasto tiene que ser del mismo equipo.
    const projectId = typeof data.projectId === "string" && data.projectId
      ? (await prisma.project.findFirst({ where: { id: data.projectId, userId: user.id }, select: { id: true } }))?.id ?? null
      : null;
    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        title: String(data.title ?? "Gasto"),
        category: data.category ?? "OTRO",
        amount: data.amount ?? 0,
        currency: data.currency ?? "USD",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        paidAt: data.paidAt ? new Date(data.paidAt) : status === "PAID" ? new Date() : null,
        status,
        isRecurring: Boolean(data.isRecurring),
        vendor: data.vendor ?? null,
        notes: data.notes ?? null,
        projectId,
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
