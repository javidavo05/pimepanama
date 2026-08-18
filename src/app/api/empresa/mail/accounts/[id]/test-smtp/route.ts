import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { assertResendConfigured, sendMailFromAccount } from "@/lib/mail/mail-send";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id, active: true } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

    assertResendConfigured();

    const config = user.configId
      ? await prisma.companyConfig.findFirst({ where: { id: user.configId } })
      : null;

    const result = await sendMailFromAccount({
      account,
      config,
      to: account.username,
      subject: "Prueba Resend — Pime Suite",
      body: "<p>Este es un correo de prueba enviado vía <strong>Resend</strong> desde Pime Suite.</p>",
    });

    return NextResponse.json({ ok: true, resendId: result.resendId });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resend test failed" },
      { status: 500 }
    );
  }
}
