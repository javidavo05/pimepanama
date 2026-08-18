/**
 * @deprecated Use `@/lib/mail/mail-send` — outbound mail now goes through Resend.
 */
export {
  sendMailFromAccount,
  sendMailViaResend,
  resolveResendFrom,
  isResendConfigured,
  assertResendConfigured,
  type SendMailParams,
  type SendMailResult,
} from "./mail-send";
