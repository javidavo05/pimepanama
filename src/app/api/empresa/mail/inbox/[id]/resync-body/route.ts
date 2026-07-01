import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { resyncEmailBodies } from "@/lib/mail/imap-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;

    const email = await prisma.inboxEmail.findFirst({
      where: { id, userId: user.id },
      include: { account: true },
    });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!email.account.active) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 400 });
    }

    const result = await resyncEmailBodies(email.account, { emailId: id });
    if (result.upgraded === 0 && result.scanned === 0) {
      const updated = await prisma.inboxEmail.findUnique({ where: { id }, select: { bodyText: true } });
      return NextResponse.json({ ...result, bodyText: updated?.bodyText ?? email.bodyText });
    }

    const updated = await prisma.inboxEmail.findUnique({ where: { id }, select: { bodyText: true } });
    return NextResponse.json({ ...result, bodyText: updated?.bodyText ?? null });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Resync error" }, { status: 500 });
  }
}
