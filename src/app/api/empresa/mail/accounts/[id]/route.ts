import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { encryptPassword } from "@/lib/mail/crypto";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const {
      label, host, port, tls, username, password, credType, smtpHost, smtpPort, smtpTls, active,
      fromName, signatureName, signatureTitle, signatureEnabled, signatureHtml,
    } = body;

    const updated = await prisma.mailAccount.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(host !== undefined && { host }),
        ...(port !== undefined && { port }),
        ...(tls !== undefined && { tls }),
        ...(username !== undefined && { username }),
        ...(password ? { passwordEnc: encryptPassword(password) } : {}),
        ...(credType !== undefined && { credType }),
        ...(smtpHost !== undefined && { smtpHost }),
        ...(smtpPort !== undefined && { smtpPort }),
        ...(smtpTls !== undefined && { smtpTls }),
        ...(active !== undefined && { active }),
        ...(fromName !== undefined && { fromName }),
        ...(signatureName !== undefined && { signatureName }),
        ...(signatureTitle !== undefined && { signatureTitle }),
        ...(signatureEnabled !== undefined && { signatureEnabled }),
        ...(signatureHtml !== undefined && { signatureHtml }),
      },
      select: {
        id: true, label: true, host: true, port: true, tls: true,
        username: true, credType: true, smtpHost: true, smtpPort: true,
        smtpTls: true, active: true, lastSyncAt: true,
        fromName: true, signatureName: true, signatureTitle: true,
        signatureEnabled: true, signatureHtml: true,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.mailAccount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
