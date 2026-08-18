import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { mailBodyHasContent } from "@/lib/mail/body-format";
import { persistSentEmail } from "@/lib/mail/persist-sent-email";
import { resolveReplyRecipient } from "@/lib/mail/reply-recipient";
import { assertResendConfigured, sendMailFromAccount } from "@/lib/mail/mail-send";
import {
  parseOutgoingAttachments,
  type MailAttachmentInput,
} from "@/lib/mail/outgoing-attachments";
import { validateMailAddressList } from "@/lib/mail/validate-address";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;

    const [email, config] = await Promise.all([
      prisma.inboxEmail.findFirst({
        where: { id, userId: user.id },
        include: { account: true },
      }),
      user.configId
        ? prisma.companyConfig.findFirst({ where: { id: user.configId } })
        : Promise.resolve(null),
    ]);

    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const account = email.account;
    assertResendConfigured();

    const { body, subject, to, cc, attachments: rawAttachments } = await request.json() as {
      body: string;
      subject?: string;
      to?: string;
      cc?: string;
      attachments?: MailAttachmentInput[];
    };
    if (!mailBodyHasContent(body ?? "")) {
      return NextResponse.json({ error: "body requerido" }, { status: 400 });
    }

    const replyTo = resolveReplyRecipient(email, account.username, to);
    const toCheck = validateMailAddressList(replyTo, "Para");
    if (!toCheck.ok) return NextResponse.json({ error: toCheck.error }, { status: 400 });

    let ccAddresses: string[] = [];
    if (cc?.trim()) {
      const ccCheck = validateMailAddressList(cc, "CC");
      if (!ccCheck.ok) return NextResponse.json({ error: ccCheck.error }, { status: 400 });
      ccAddresses = ccCheck.addresses;
    }

    const replySubject =
      subject ?? (email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject ?? ""}`);
    const attachments = parseOutgoingAttachments(rawAttachments);

    const result = await sendMailFromAccount({
      account,
      config,
      to: replyTo,
      cc: cc?.trim() || undefined,
      subject: replySubject,
      body,
      inReplyTo: email.messageId ?? undefined,
      references: email.messageId ?? undefined,
      attachments,
    });

    const sentEmail = await persistSentEmail({
      account,
      userId: user.id,
      config,
      subject: replySubject,
      body,
      toAddresses: toCheck.addresses,
      ccAddresses,
      messageId: result.messageId,
      resendId: result.resendId,
      attachments,
      inReplyTo: email.messageId ?? undefined,
      referencesHeader: email.messageId ?? undefined,
      repliedToEmailId: email.id,
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
