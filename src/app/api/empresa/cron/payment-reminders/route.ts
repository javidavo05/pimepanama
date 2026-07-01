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

  // Find schedules due within 3 days, not reminded yet
  const upcoming = await prisma.paymentSchedule.findMany({
    where: {
      status: "PENDING",
      reminderSent: false,
      dueDate: { lte: in3d },
    },
    include: {
      document: {
        select: { number: true, clientName: true, userId: true },
      },
    },
  });

  // Mark overdue schedules
  await prisma.paymentSchedule.updateMany({
    where: {
      status: "PENDING",
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });

  let notified = 0;
  for (const schedule of upcoming) {
    const isOverdue = schedule.dueDate < now;
    const daysUntil = Math.ceil((schedule.dueDate.getTime() - now.getTime()) / 86400000);
    const label = isOverdue
      ? `Pago vencido — ${schedule.description}`
      : `Pago próximo en ${daysUntil}d — ${schedule.description}`;

    await prisma.mailNotification.create({
      data: {
        userId: schedule.document.userId,
        title: `💰 ${label}`,
        body: `${schedule.document.number ?? schedule.document.clientName}: $${Number(schedule.amount).toFixed(2)} — vence ${schedule.dueDate.toLocaleDateString("es-PA")}`,
      },
    });

    await prisma.paymentSchedule.update({
      where: { id: schedule.id },
      data: { reminderSent: true },
    });

    notified++;
  }

  return NextResponse.json({ ok: true, notified, overdueUpdated: upcoming.filter((s) => s.dueDate < now).length });
}
