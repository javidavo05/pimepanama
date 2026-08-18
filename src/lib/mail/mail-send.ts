import type { CompanyConfig, MailAccount } from "@prisma/client";
import type { MailOutgoingAttachment } from "./outgoing-attachments";
import { sendMailViaResend, type ResendSendResult } from "./resend-send";

export type SendMailParams = {
  account: MailAccount;
  config: Pick<CompanyConfig, "name" | "email" | "phone" | "website" | "logoUrl"> | null;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  attachments?: MailOutgoingAttachment[];
};

export type SendMailResult = ResendSendResult & {
  response?: string;
};

/** Unified outbound send — Resend API (replaces SMTP/nodemailer). */
export async function sendMailFromAccount(params: SendMailParams): Promise<SendMailResult> {
  const result = await sendMailViaResend({
    account: params.account,
    config: params.config,
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    body: params.body,
    inReplyTo: params.inReplyTo,
    references: params.references,
    attachments: params.attachments,
  });

  return {
    ...result,
    response: `resend:${result.resendId}`,
  };
}

export { isResendConfigured, assertResendConfigured } from "./resend-client";
export { sendMailViaResend, resolveResendFrom } from "./resend-send";
