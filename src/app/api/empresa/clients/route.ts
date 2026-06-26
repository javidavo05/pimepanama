import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const clients = await prisma.client.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(clients);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const data = await request.json();
    const client = await prisma.client.create({
      data: { ...data, userId: user.id },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
