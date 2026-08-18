import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const leads = await prisma.lead.findMany({
      where: { userId: user.id, ...(status ? { status: status as never } : {}) },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(leads);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const data = await request.json();
    const lead = await prisma.lead.create({
      data: { ...data, userId: user.id },
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
