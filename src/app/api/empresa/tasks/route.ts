import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const { searchParams } = new URL(request.url);
    const completed = searchParams.get("completed");
    const documentId = searchParams.get("documentId");
    const paymentScheduleId = searchParams.get("paymentScheduleId");

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        ...(completed !== null ? { completed: completed === "1" } : {}),
        ...(documentId ? { documentId } : {}),
        ...(paymentScheduleId ? { paymentScheduleId } : {}),
      },
      include: {
        document: { select: { id: true, type: true, number: true, clientName: true, clientCompany: true } },
        paymentSchedule: { select: { id: true, description: true, documentId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const data = await request.json();

    if (!data.title || typeof data.title !== "string") {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: data.title,
        description: data.description ?? null,
        assignee: data.assignee ?? null,
        priority: data.priority ?? "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        allDay: data.allDay ?? true,
        documentId: data.documentId ?? null,
        paymentScheduleId: data.paymentScheduleId ?? null,
      },
      include: {
        document: { select: { id: true, type: true, number: true, clientName: true, clientCompany: true } },
        paymentSchedule: { select: { id: true, description: true, documentId: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
