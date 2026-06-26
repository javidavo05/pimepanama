import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const email = await prisma.inboxEmail.findFirst({
      where: { id, userId: user.id },
      include: {
        attachments: true,
        account: { select: { id: true, label: true, smtpHost: true } },
      },
    });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Mark as read
    if (!email.isRead) {
      await prisma.inboxEmail.update({ where: { id }, data: { isRead: true } });
    }

    return NextResponse.json(email);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const email = await prisma.inboxEmail.findFirst({ where: { id, userId: user.id } });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const updated = await prisma.inboxEmail.update({
      where: { id },
      data: {
        ...(body.isRead !== undefined && { isRead: body.isRead }),
        ...(body.isStarred !== undefined && { isStarred: body.isStarred }),
      },
      select: { id: true, isRead: true, isStarred: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
