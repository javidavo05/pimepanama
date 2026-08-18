import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const upcoming = await prisma.task.findMany({
    where: {
      completed: false,
      reminderSent: false,
      dueDate: { lte: in3d },
    },
  });

  let notified = 0;
  for (const task of upcoming) {
    const isOverdue = task.dueDate! < now;
    const daysUntil = Math.ceil((task.dueDate!.getTime() - now.getTime()) / 86400000);
    const label = isOverdue
      ? `Tarea vencida — ${task.title}`
      : daysUntil === 0
        ? `Tarea vence hoy — ${task.title}`
        : `Tarea vence en ${daysUntil}d — ${task.title}`;

    await prisma.mailNotification.create({
      data: {
        userId: task.userId,
        title: `📋 ${label}`,
        body: task.assignee ? `Responsable: ${task.assignee}` : "Sin responsable asignado",
        link: "/empresa/tareas",
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { reminderSent: true },
    });

    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
