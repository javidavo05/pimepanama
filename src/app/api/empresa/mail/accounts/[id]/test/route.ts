import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { decryptPassword } from "@/lib/mail/crypto";
import { testConnection } from "@/lib/mail/imap-sync";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const password = decryptPassword(account.passwordEnc);
    const result = await testConnection(account.host, account.port, account.tls, account.username, password);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
