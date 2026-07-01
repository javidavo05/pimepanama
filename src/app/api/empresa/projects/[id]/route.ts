import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serializers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: {
      client: { select: { id: true, name: true, company: true, email: true } },
      contracts: { orderBy: { createdAt: "desc" } },
      documents: {
        select: { id: true, type: true, number: true, status: true, total: true, issueDate: true, clientName: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...serializeProject(project),
    client: project.client,
    contracts: project.contracts,
    documents: project.documents.map((d) => ({
      ...d,
      total: d.total != null ? Number(d.total) : null,
      issueDate: d.issueDate.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const { id } = await params;
  const existing = await prisma.project.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const project = await prisma.project.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      clientId: body.clientId ?? undefined,
      description: body.description ?? undefined,
      scope: body.scope ?? undefined,
      status: body.status ?? undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      totalBudget: body.totalBudget ?? undefined,
      aiSummary: body.aiSummary ?? undefined,
      aiTags: body.aiTags ?? undefined,
    },
  });

  return NextResponse.json(serializeProject(project));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const { id } = await params;
  const existing = await prisma.project.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
