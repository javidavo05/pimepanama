import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseIds(body: unknown): string[] | null {
  if (!body || typeof body !== "object" || !("ids" in body)) return null;
  const ids = (body as { ids: unknown }).ids;
  if (!Array.isArray(ids) || ids.length === 0) return null;
  if (!ids.every((id) => typeof id === "string" && id.length > 0)) return null;
  return ids.slice(0, 200);
}

export async function PATCH(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = await request.json();
    const ids = parseIds(body);
    if (!ids) return NextResponse.json({ error: "ids requeridos" }, { status: 400 });

    const isRead = body.isRead;
    if (typeof isRead !== "boolean") {
      return NextResponse.json({ error: "isRead debe ser boolean" }, { status: 400 });
    }

    const result = await prisma.inboxEmail.updateMany({
      where: { id: { in: ids }, userId: user.id },
      data: { isRead },
    });

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = await request.json();
    const ids = parseIds(body);
    if (!ids) return NextResponse.json({ error: "ids requeridos" }, { status: 400 });

    const result = await prisma.inboxEmail.deleteMany({
      where: { id: { in: ids }, userId: user.id },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
