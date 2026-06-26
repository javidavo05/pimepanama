import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const methods = await prisma.paymentMethod.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(methods);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const data = await request.json();
    const method = await prisma.paymentMethod.create({
      data: { ...data, userId: user.id },
    });
    return NextResponse.json(method, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
