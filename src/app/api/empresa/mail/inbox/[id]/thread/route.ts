import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { mailBodyPreview } from "@/lib/mail/body-format";
import { findThreadEmails, threadSummary } from "@/lib/mail/thread";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(_request);
    const { id } = await params;

    const email = await prisma.inboxEmail.findFirst({
      where: { id, userId: user.id },
      include: { account: { select: { label: true, username: true } } },
    });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const messages = await findThreadEmails(user.id, email);
    const summary = threadSummary(messages);

    return NextResponse.json({
      currentId: email.id,
      summary,
      messages: messages.map((m) => ({
        id: m.id,
        folder: m.folder,
        subject: m.subject,
        fromName: m.fromName,
        fromEmail: m.fromEmail,
        toAddresses: m.toAddresses,
        receivedAt: m.receivedAt.toISOString(),
        deliveryStatus: m.deliveryStatus,
        resendId: m.resendId,
        deliveredAt: m.deliveredAt?.toISOString() ?? null,
        openedAt: m.openedAt?.toISOString() ?? null,
        bouncedAt: m.bouncedAt?.toISOString() ?? null,
        bounceReason: m.bounceReason,
        bodyPreview: mailBodyPreview(m.bodyText, 140),
        smtpAccepted: m.smtpAccepted,
        smtpRejected: m.smtpRejected,
        messageId: m.messageId,
        accountLabel: m.account.label,
        isCurrent: m.id === email.id,
      })),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Thread error" },
      { status: 500 }
    );
  }
}
