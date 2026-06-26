import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const notifications = await prisma.mailNotification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const unreadCount = await prisma.mailNotification.count({
      where: { userId: user.id, read: false },
    });
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    await prisma.mailNotification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
