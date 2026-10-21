/** Enviar un correo desde una cuenta del panel, como lo hace el redactor: Resend + copia en Enviados ligada al cliente o lead. */
import { prisma } from "@/lib/prisma";
import { persistSentEmail } from "@/lib/mail/persist-sent-email";
import { assertResendConfigured, sendMailFromAccount } from "@/lib/mail/mail-send";
import { parseMailAddressList, validateMailAddressList } from "@/lib/mail/validate-address";

/** Texto plano a HTML sencillo: párrafos y saltos de línea, con todo escapado. */
export function textoAHtml(texto: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return texto.trim().split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
}

/** La cuenta con la que firma la empresa, o la primera activa. */
export async function cuentaParaEnviar(userId: string, configId: string | null, cuentaId?: string | null) {
  if (cuentaId) return prisma.mailAccount.findFirst({ where: { id: cuentaId, userId, active: true } });
  const config = configId ? await prisma.companyConfig.findFirst({ where: { id: configId }, select: { signingMailAccountId: true } }) : null;
  if (config?.signingMailAccountId) {
    const c = await prisma.mailAccount.findFirst({ where: { id: config.signingMailAccountId, userId, active: true } });
    if (c) return c;
  }
  return prisma.mailAccount.findFirst({ where: { userId, active: true }, orderBy: { createdAt: "asc" } });
}

export async function enviarCorreo(p: { userId: string; configId: string | null; cuentaId: string; para: string; cc?: string | null; asunto: string; cuerpo: string; responderA?: string | null }) {
  assertResendConfigured();
  const account = await prisma.mailAccount.findFirst({ where: { id: p.cuentaId, userId: p.userId, active: true } });
  if (!account) throw new Error("La cuenta de correo ya no está activa.");
  const para = validateMailAddressList(p.para, "Para");
  if (!para.ok) throw new Error(para.error);
  if (p.cc?.trim()) { const cc = validateMailAddressList(p.cc, "CC"); if (!cc.ok) throw new Error(cc.error); }
  const config = p.configId ? await prisma.companyConfig.findFirst({ where: { id: p.configId } }) : null;
  const ref = p.responderA ? await prisma.inboxEmail.findFirst({ where: { id: p.responderA, userId: p.userId }, select: { messageId: true } }) : null;
  const body = textoAHtml(p.cuerpo);
  const r = await sendMailFromAccount({ account, config, to: p.para.trim(), cc: p.cc?.trim() || undefined, subject: p.asunto.trim(), body, inReplyTo: ref?.messageId ?? undefined, references: ref?.messageId ?? undefined });
  return persistSentEmail({
    account, userId: p.userId, config, subject: p.asunto.trim(), body,
    toAddresses: para.addresses, ccAddresses: p.cc ? parseMailAddressList(p.cc) : [],
    messageId: r.messageId, resendId: r.resendId, inReplyTo: ref?.messageId ?? undefined, referencesHeader: ref?.messageId ?? undefined,
    repliedToEmailId: p.responderA ?? undefined, smtpAccepted: r.accepted.map(String), smtpRejected: r.rejected.map(String), smtpResponse: r.response,
  });
}
