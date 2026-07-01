import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { serializeSchedule } from "@/lib/serializers";

export async function GET(req: NextRequest) {
  const user = await requireEmpresaUser(req);
  const sp = req.nextUrl.searchParams;
  const documentId = sp.get("documentId") ?? undefined;
  const status = sp.get("status") ?? undefined;
  const overdue = sp.get("overdue") === "1";

  const now = new Date();

  const schedules = await prisma.paymentSchedule.findMany({
    where: {
      userId: user.id,
      ...(documentId && { documentId }),
      ...(status && { status: status as never }),
      ...(overdue && { dueDate: { lt: now }, status: "PENDING" }),
    },
    include: {
      document: {
        select: {
          id: true, type: true, number: true, clientName: true, clientCompany: true,
          projectId: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(schedules.map((s) => ({
    ...serializeSchedule(s),
    document: {
      ...s.document,
      project: s.document.project,
    },
  })));
}

export async function POST(req: NextRequest) {
  const user = await requireEmpresaUser(req);
  const body = await req.json();

  const doc = await prisma.document.findFirst({
    where: { id: body.documentId, userId: user.id },
  });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const schedule = await prisma.paymentSchedule.create({
    data: {
      userId: user.id,
      documentId: body.documentId,
      description: body.description,
      amount: body.amount,
      dueDate: new Date(body.dueDate),
    },
  });

  return NextResponse.json(serializeSchedule(schedule), { status: 201 });
}
