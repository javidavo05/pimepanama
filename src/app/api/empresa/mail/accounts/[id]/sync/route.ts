import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { syncAccount } from "@/lib/mail/imap-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!account.active) return NextResponse.json({ error: "Account is inactive" }, { status: 400 });

    const result = await syncAccount(account);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync error" }, { status: 500 });
  }
}
