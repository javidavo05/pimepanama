import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { serializeContract } from "@/lib/serializers";

export async function GET(req: NextRequest) {
  const user = await requireEmpresaUser(req);
  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("projectId") ?? undefined;
  const clientId = sp.get("clientId") ?? undefined;
  const status = sp.get("status") ?? undefined;

  const contracts = await prisma.contract.findMany({
    where: {
      userId: user.id,
      ...(projectId && { projectId }),
      ...(clientId && { clientId }),
      ...(status && { status: status as never }),
    },
    include: {
      client: { select: { id: true, name: true, company: true } },
      project: { select: { id: true, name: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(contracts.map((c) => ({
    ...serializeContract(c),
    client: c.client,
    project: c.project,
  })));
}

export async function POST(req: NextRequest) {
  const user = await requireEmpresaUser(req);
  const body = await req.json();

  const contract = await prisma.contract.create({
    data: {
      userId: user.id,
      title: body.title,
      projectId: body.projectId || undefined,
      clientId: body.clientId || undefined,
      description: body.description || undefined,
      responsibilities: body.responsibilities || undefined,
      terms: body.terms || undefined,
      status: body.status ?? "DRAFT",
      signedAt: body.signedAt ? new Date(body.signedAt) : undefined,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      value: body.value ?? undefined,
    },
  });

  return NextResponse.json(serializeContract(contract), { status: 201 });
}
