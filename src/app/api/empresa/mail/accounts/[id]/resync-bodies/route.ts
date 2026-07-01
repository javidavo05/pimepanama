import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { resyncEmailBodies } from "@/lib/mail/imap-sync";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!account.active) return NextResponse.json({ error: "Account is inactive" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);

    const result = await resyncEmailBodies(account, { limit });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Resync error" }, { status: 500 });
  }
}
