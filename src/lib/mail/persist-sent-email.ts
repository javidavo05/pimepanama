import type { CompanyConfig, MailAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { MailOutgoingAttachment } from "./outgoing-attachments";
import { wrapBodyWithSignature } from "./signature";
import { buildThreadKey } from "./thread";

export async function persistSentEmail(params: {
  account: MailAccount;
  userId: string;
  config: Pick<CompanyConfig, "name" | "email" | "phone" | "website" | "logoUrl"> | null;
  subject: string;
  body: string;
  toAddresses: string[];
  ccAddresses?: string[];
  messageId: string;
  resendId?: string;
  attachments?: MailOutgoingAttachment[];
  inReplyTo?: string;
  referencesHeader?: string;
  repliedToEmailId?: string;
  smtpAccepted?: string[];
  smtpRejected?: string[];
  smtpResponse?: string;
}) {
  const { html } = wrapBodyWithSignature(params.body, params.account, params.config);
  const syntheticUid = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
  const threadKey = buildThreadKey({
    subject: params.subject,
    accountUsername: params.account.username,
    fromEmail: params.account.username,
    toAddresses: params.toAddresses,
    folder: "SENT",
  });

  const sentEmail = await prisma.inboxEmail.create({
    data: {
      accountId: params.account.id,
      userId: params.userId,
      uid: syntheticUid,
      messageId: params.messageId,
      resendId: params.resendId,
      inReplyTo: params.inReplyTo,
      referencesHeader: params.referencesHeader,
      threadKey,
      repliedToEmailId: params.repliedToEmailId,
      deliveryStatus: params.resendId ? "SENT" : "UNKNOWN",
      smtpAccepted: params.smtpAccepted ?? params.toAddresses,
      smtpRejected: params.smtpRejected ?? [],
      smtpResponse: params.smtpResponse,
      subject: params.subject,
      fromName:
        params.account.fromName ??
        params.account.signatureName ??
        params.config?.name ??
        params.account.label,
      fromEmail: params.account.username,
      toAddresses: params.toAddresses,
      ccAddresses: params.ccAddresses ?? [],
      bodyText: html.slice(0, 50000),
      receivedAt: new Date(),
      isRead: true,
      folder: "SENT",
    },
  });

  if (params.attachments?.length) {
    await prisma.emailAttachment.createMany({
      data: params.attachments.map((att) => ({
        emailId: sentEmail.id,
        filename: att.filename,
        contentType: att.contentType,
        size: att.content.length,
      })),
    });
  }

  return sentEmail;
}
