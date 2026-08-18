import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { mailBodyHasContent } from "@/lib/mail/body-format";
import { persistSentEmail } from "@/lib/mail/persist-sent-email";
import { assertResendConfigured, sendMailFromAccount } from "@/lib/mail/mail-send";
import {
  parseOutgoingAttachments,
  type MailAttachmentInput,
} from "@/lib/mail/outgoing-attachments";
import { validateMailAddressList, parseMailAddressList } from "@/lib/mail/validate-address";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id, active: true } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertResendConfigured();

    const body = await request.json() as {
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
      replyToEmailId?: string;
      attachments?: MailAttachmentInput[];
    };

    if (!body.to?.trim()) return NextResponse.json({ error: "to requerido" }, { status: 400 });
    const toCheck = validateMailAddressList(body.to, "Para");
    if (!toCheck.ok) return NextResponse.json({ error: toCheck.error }, { status: 400 });
    if (body.cc?.trim()) {
      const ccCheck = validateMailAddressList(body.cc, "CC");
      if (!ccCheck.ok) return NextResponse.json({ error: ccCheck.error }, { status: 400 });
    }
    if (body.bcc?.trim()) {
      const bccCheck = validateMailAddressList(body.bcc, "BCC");
      if (!bccCheck.ok) return NextResponse.json({ error: bccCheck.error }, { status: 400 });
    }
    if (!body.subject?.trim()) return NextResponse.json({ error: "subject requerido" }, { status: 400 });
    if (!mailBodyHasContent(body.body ?? "")) {
      return NextResponse.json({ error: "body requerido" }, { status: 400 });
    }

    const config = user.configId
      ? await prisma.companyConfig.findFirst({ where: { id: user.configId } })
      : null;

    let inReplyTo: string | undefined;
    let references: string | undefined;
    if (body.replyToEmailId) {
      const ref = await prisma.inboxEmail.findFirst({
        where: { id: body.replyToEmailId, userId: user.id },
        select: { messageId: true },
      });
      if (ref?.messageId) {
        inReplyTo = ref.messageId;
        references = ref.messageId;
      }
    }

    const attachments = parseOutgoingAttachments(body.attachments);

    const result = await sendMailFromAccount({
      account,
      config,
      to: body.to.trim(),
      cc: body.cc?.trim() || undefined,
      bcc: body.bcc?.trim() || undefined,
      subject: body.subject.trim(),
      body: body.body,
      inReplyTo,
      references,
      attachments,
    });

    const sentEmail = await persistSentEmail({
      account,
      userId: user.id,
      config,
      subject: body.subject.trim(),
      body: body.body,
      toAddresses: toCheck.addresses,
      ccAddresses: body.cc ? parseMailAddressList(body.cc) : [],
      messageId: result.messageId,
      resendId: result.resendId,
      attachments,
      inReplyTo,
      referencesHeader: references,
      repliedToEmailId: body.replyToEmailId,
      smtpAccepted: result.accepted.map(String),
      smtpRejected: result.rejected.map(String),
      smtpResponse: result.response,
    });

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      sentEmailId: sentEmail.id,
      resendId: result.resendId,
      deliveryStatus: sentEmail.deliveryStatus,
      attachmentCount: attachments.length,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send error" },
      { status: 500 }
    );
  }
}
