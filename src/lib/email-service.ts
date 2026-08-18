import { sendMailViaResend } from "@/lib/mail/resend-send";
import { isResendConfigured } from "@/lib/mail/resend-client";

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}) {
  if (!isResendConfigured()) {
    throw new Error("RESEND_API_KEY no configurada");
  }

  const toStr = Array.isArray(to) ? to.join(",") : to;
  const result = await sendMailViaResend({
    account: null,
    config: null,
    to: toStr,
    subject,
    body: html,
    from: from ?? process.env.RESEND_FROM,
    skipSignature: true,
  });

  return { success: true, messageId: result.resendId, resendId: result.resendId };
}

export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
  }>
) {
  const results = await Promise.allSettled(
    emails.map((email) =>
      sendEmail({
        to: email.to,
        subject: email.subject,
        html: email.html,
      })
    )
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return {
    successful,
    failed,
    total: emails.length,
    results,
  };
}
