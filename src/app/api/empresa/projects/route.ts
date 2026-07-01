import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serializers";

export async function GET(req: NextRequest) {
  const user = await requireEmpresaUser(req);
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? undefined;
  const clientId = sp.get("clientId") ?? undefined;

  const projects = await prisma.project.findMany({
    where: {
      userId: user.id,
      ...(status && { status: status as never }),
      ...(clientId && { clientId }),
    },
    include: {
      client: { select: { id: true, name: true, company: true } },
      _count: { select: { documents: true, contracts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects.map((p) => ({
    ...serializeProject(p),
    client: p.client,
    _count: p._count,
  })));
}

export async function POST(req: NextRequest) {
  const user = await requireEmpresaUser(req);
  const body = await req.json();

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: body.name,
      clientId: body.clientId || undefined,
      description: body.description || undefined,
      scope: body.scope || undefined,
      status: body.status ?? "ACTIVE",
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      totalBudget: body.totalBudget ?? undefined,
      aiSummary: body.aiSummary || undefined,
      aiTags: body.aiTags ?? [],
    },
  });

  return NextResponse.json(serializeProject(project), { status: 201 });
}
