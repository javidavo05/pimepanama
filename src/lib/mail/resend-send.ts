import type { CompanyConfig, MailAccount } from "@prisma/client";
import { extractEmailAddress } from "./thread";
import type { MailOutgoingAttachment } from "./outgoing-attachments";
import { wrapBodyWithSignature, type SignatureConfig } from "./signature";
import { htmlToPlainText } from "./body-format";
import { assertResendConfigured, getResendClient } from "./resend-client";
import { parseMailAddressList } from "./validate-address";

export type ResendSendParams = {
  account?: MailAccount | null;
  config: Pick<CompanyConfig, "name" | "email" | "phone" | "website" | "logoUrl"> | null;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  attachments?: MailOutgoingAttachment[];
  /** Override from address (must be verified in Resend) */
  from?: string;
  replyTo?: string;
  /** Skip mail hub signature block (contact form, system emails) */
  skipSignature?: boolean;
};

export type ResendSendResult = {
  resendId: string;
  messageId: string;
  accepted: string[];
  rejected: string[];
  from: string;
};

function allowedDomains(): string[] {
  const explicit = process.env.RESEND_ALLOWED_DOMAINS?.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (explicit?.length) return explicit;

  const from = process.env.RESEND_FROM ?? "";
  const match = from.match(/@([a-z0-9.-]+)/i);
  return match?.[1] ? [match[1].toLowerCase()] : [];
}

function emailDomain(email: string): string | null {
  const addr = extractEmailAddress(email);
  const parts = addr.split("@");
  return parts[1]?.toLowerCase() ?? null;
}

function isVerifiedSenderEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  const allowed = allowedDomains();
  return allowed.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function resolveResendFrom(
  account: MailAccount | null | undefined,
  config: ResendSendParams["config"]
): { from: string; replyTo?: string } {
  const defaultFrom = process.env.RESEND_FROM?.trim();
  if (!defaultFrom) {
    throw new Error("RESEND_FROM no configurado");
  }

  const display =
    account?.fromName ??
    account?.signatureName ??
    config?.name ??
    account?.label ??
    "PIME Panama";

  if (account?.username && isVerifiedSenderEmail(account.username)) {
    const email = extractEmailAddress(account.username);
    return {
      from: `"${display}" <${email}>`,
      replyTo: email,
    };
  }

  const replyTo = account?.username ? extractEmailAddress(account.username) : config?.email ?? undefined;
  return {
    from: defaultFrom.includes("<") ? defaultFrom : `"${display}" <${defaultFrom}>`,
    replyTo,
  };
}

export async function sendMailViaResend(params: ResendSendParams): Promise<ResendSendResult> {
  assertResendConfigured();

  const { to, cc, bcc, subject, body, inReplyTo, references, attachments } = params;
  const { from, replyTo } = params.from
    ? { from: params.from, replyTo: params.replyTo }
    : resolveResendFrom(params.account, params.config);

  const signatureAccount = (params.account ?? {
    fromName: null,
    signatureName: null,
    signatureTitle: null,
    signatureEnabled: true,
    signatureHtml: null,
    label: "PIME",
    username: from,
  }) as SignatureConfig;

  const { html, text } = params.skipSignature
    ? { html: body, text: htmlToPlainText(body) }
    : wrapBodyWithSignature(body, signatureAccount, params.config);
  const resend = getResendClient();

  const toList = parseMailAddressList(to);
  const ccList = cc?.trim() ? parseMailAddressList(cc) : undefined;
  const bccList = bcc?.trim() ? parseMailAddressList(bcc) : undefined;

  const headers: Record<string, string> = {};
  if (inReplyTo) {
    headers["In-Reply-To"] = inReplyTo;
    headers.References = references ?? inReplyTo;
  }

  const { data, error } = await resend.emails.send({
    from,
    to: toList,
    ...(ccList?.length ? { cc: ccList } : {}),
    ...(bccList?.length ? { bcc: bccList } : {}),
    ...(replyTo ? { replyTo } : {}),
    subject,
    html,
    text,
    ...(Object.keys(headers).length ? { headers } : {}),
    ...(attachments?.length
      ? {
          attachments: attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          })),
        }
      : {}),
  });

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Resend no devolvió id de envío");
  }

  return {
    resendId: data.id,
    messageId: `<${data.id}@resend.dev>`,
    accepted: toList,
    rejected: [],
    from,
  };
}
