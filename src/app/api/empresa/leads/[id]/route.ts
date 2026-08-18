import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const lead = await prisma.lead.findFirst({
      where: { id, userId: user.id },
    });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // History grouped by type
    const docs = await prisma.document.findMany({
      where: { leadId: id, userId: user.id },
      select: { id: true, type: true, status: true, number: true, title: true, total: true, issueDate: true, createdAt: true },
      orderBy: { issueDate: "desc" },
      take: 20,
    });

    const byType: Record<string, { count: number; lastDate: string; total: number; docs: typeof docs }> = {};
    for (const doc of docs) {
      if (!byType[doc.type]) byType[doc.type] = { count: 0, lastDate: "", total: 0, docs: [] };
      byType[doc.type].count++;
      if (!byType[doc.type].lastDate) byType[doc.type].lastDate = doc.issueDate.toISOString();
      byType[doc.type].total += Number(doc.total ?? 0);
      if (byType[doc.type].docs.length < 4) byType[doc.type].docs.push(doc);
    }

    return NextResponse.json({ lead, history: byType, totalDocs: docs.length });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.lead.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = await request.json();
    const lead = await prisma.lead.update({ where: { id }, data });
    return NextResponse.json(lead);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.lead.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.convertedClientId) {
      return NextResponse.json({ error: "No se puede eliminar un lead ya convertido a cliente" }, { status: 400 });
    }
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
