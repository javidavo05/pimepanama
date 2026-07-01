import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await requireEmpresaUser(req);
  const now = new Date();
  const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Documents with pending payment
  const rawDocs = await prisma.document.findMany({
    where: {
      userId: user.id,
      type: { in: ["FACTURA", "COTIZACION"] },
      status: { in: ["SENT", "ACCEPTED"] },
      total: { not: null, gt: 0 },
    },
    select: {
      id: true, type: true, number: true, clientName: true, clientCompany: true,
      total: true, dueDate: true, issueDate: true, status: true, content: true,
      linkedDocumentId: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  // Excluir COTIZACIONes que ya tienen FACTURA vinculada
  const pendingDocs = rawDocs.filter((d) => {
    if (d.type === "COTIZACION") {
      if (d.linkedDocumentId) return false;
      const c = d.content as Record<string, unknown> | null;
      return !c?.linkedInvoiceId;
    }
    return true;
  });

  // Payment schedules pending
  const schedules = await prisma.paymentSchedule.findMany({
    where: {
      userId: user.id,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    include: {
      document: {
        select: {
          id: true, type: true, number: true, clientName: true, clientCompany: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const totalDocs = pendingDocs.reduce((s, d) => s + Number(d.total ?? 0), 0);
  const totalSchedules = schedules.reduce((s, sc) => s + Number(sc.amount), 0);

  const overdueDocs = pendingDocs
    .filter((d) => d.dueDate && d.dueDate < now)
    .reduce((s, d) => s + Number(d.total ?? 0), 0);

  const overdueSchedules = schedules
    .filter((s) => s.dueDate < now || s.status === "OVERDUE")
    .reduce((s, sc) => s + Number(sc.amount), 0);

  const due30dSchedules = schedules
    .filter((s) => s.dueDate >= now && s.dueDate <= in30d)
    .reduce((s, sc) => s + Number(sc.amount), 0);

  const due7dSchedules = schedules
    .filter((s) => s.dueDate >= now && s.dueDate <= in7d)
    .reduce((s, sc) => s + Number(sc.amount), 0);

  return NextResponse.json({
    totalPending: totalDocs + totalSchedules,
    overdueAmount: overdueDocs + overdueSchedules,
    due7dAmount: due7dSchedules,
    due30dAmount: due30dSchedules,
    documents: pendingDocs.map((d) => ({
      ...d,
      total: d.total != null ? Number(d.total) : null,
      dueDate: d.dueDate?.toISOString() ?? null,
      issueDate: d.issueDate.toISOString(),
    })),
    schedules: schedules.map((s) => ({
      id: s.id,
      description: s.description,
      amount: Number(s.amount),
      dueDate: s.dueDate.toISOString(),
      status: s.status,
      reminderSent: s.reminderSent,
      document: {
        ...s.document,
        project: s.document.project,
      },
    })),
  });
}
