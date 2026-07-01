import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { serializeContract } from "@/lib/serializers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const contract = await prisma.contract.findFirst({
    where: { id, userId: user.id },
    include: {
      client: { select: { id: true, name: true, company: true, email: true } },
      project: { select: { id: true, name: true, status: true } },
      documents: {
        select: { id: true, type: true, number: true, status: true, total: true, issueDate: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...serializeContract(contract),
    client: contract.client,
    project: contract.project,
    documents: contract.documents.map((d) => ({
      ...d,
      total: d.total != null ? Number(d.total) : null,
      issueDate: d.issueDate.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const { id } = await params;
  const existing = await prisma.contract.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const contract = await prisma.contract.update({
    where: { id },
    data: {
      title: body.title ?? undefined,
      projectId: body.projectId ?? undefined,
      clientId: body.clientId ?? undefined,
      description: body.description ?? undefined,
      responsibilities: body.responsibilities ?? undefined,
      terms: body.terms ?? undefined,
      status: body.status ?? undefined,
      signedAt: body.signedAt ? new Date(body.signedAt) : undefined,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      value: body.value ?? undefined,
    },
  });

  return NextResponse.json(serializeContract(contract));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const { id } = await params;
  const existing = await prisma.contract.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contract.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
