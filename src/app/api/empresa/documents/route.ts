import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import type { DocumentType } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as DocumentType | null;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = 20;

    const documents = await prisma.document.findMany({
      where: {
        userId: user.id,
        ...(type && { type }),
        ...(status && { status: status as never }),
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({ documents });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = await request.json();

    const prefix =
      body.type === "FACTURA"
        ? (user.config?.invoicePrefix ?? "INV")
        : body.type === "COTIZACION"
          ? (user.config?.quotePrefix ?? "COT")
          : body.type === "BITACORA"
            ? "BIT"
            : "COR";

    const year = new Date().getFullYear();
    const count = await prisma.document.count({
      where: { type: body.type, userId: user.id },
    });
    const number = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

    const doc = await prisma.document.create({
      data: { ...body, number, userId: user.id },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
