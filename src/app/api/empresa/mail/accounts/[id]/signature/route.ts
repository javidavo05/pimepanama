import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { buildSignatureHtml } from "@/lib/mail/signature";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await request.json();
    const config = user.configId
      ? await prisma.companyConfig.findFirst({ where: { id: user.configId } })
      : null;

    const updated = await prisma.mailAccount.update({
      where: { id },
      data: {
        ...(data.fromName !== undefined && { fromName: data.fromName || null }),
        ...(data.signatureName !== undefined && { signatureName: data.signatureName || null }),
        ...(data.signatureTitle !== undefined && { signatureTitle: data.signatureTitle || null }),
        ...(data.signatureEnabled !== undefined && { signatureEnabled: Boolean(data.signatureEnabled) }),
        ...(data.signatureHtml !== undefined && { signatureHtml: data.signatureHtml || null }),
      },
    });

    const previewHtml = buildSignatureHtml(updated, config);
    return NextResponse.json({ account: updated, previewHtml });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
