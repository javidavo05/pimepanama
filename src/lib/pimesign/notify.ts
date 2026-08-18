import { prisma } from "@/lib/prisma";
import { sendMailFromAccount } from "@/lib/mail/mail-send";
import { signingLink } from "./config";

export async function getSigningMailAccount(userId: string, preferredId?: string | null) {
  if (preferredId) {
    const preferred = await prisma.mailAccount.findFirst({
      where: { id: preferredId, userId, active: true },
    });
    if (preferred) return preferred;
  }
  return prisma.mailAccount.findFirst({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendSigningEmail(opts: {
  userId: string;
  mailAccountId?: string | null;
  to: string;
  subject: string;
  body: string;
  companyName?: string | null;
}) {
  const account = await getSigningMailAccount(opts.userId, opts.mailAccountId);
  if (!account) {
    throw new Error("No hay cuenta de correo activa para enviar la firma.");
  }

  const config = await prisma.companyConfig.findFirst({
    where: { users: { some: { id: opts.userId } } },
  });

  await sendMailFromAccount({
    account,
    config,
    to: opts.to,
    subject: opts.subject,
    body: opts.body,
  });
}

export function clientSigningEmail(opts: {
  contractTitle: string;
  clientName: string;
  companyName: string;
  token: string;
}) {
  const link = signingLink(opts.token);
  return {
    subject: `Firma requerida: ${opts.contractTitle}`,
    body: `<p>Hola ${opts.clientName},</p>
<p><strong>${opts.companyName}</strong> te envió el contrato <strong>${opts.contractTitle}</strong> para firma digital.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#C8A96E;color:#030611;text-decoration:none;border-radius:8px;font-weight:600">Revisar y firmar</a></p>
<p>O copia este enlace: <a href="${link}">${link}</a></p>
<p>Este enlace es personal y expira en unos días.</p>`,
  };
}

export function companySigningEmail(opts: {
  contractTitle: string;
  companyName: string;
  clientName: string;
  token: string;
}) {
  const link = signingLink(opts.token);
  return {
    subject: `Tu firma requerida: ${opts.contractTitle}`,
    body: `<p>El cliente <strong>${opts.clientName}</strong> ya firmó el contrato <strong>${opts.contractTitle}</strong>.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#C8A96E;color:#030611;text-decoration:none;border-radius:8px;font-weight:600">Firmar como ${opts.companyName}</a></p>
<p>O copia este enlace: <a href="${link}">${link}</a></p>`,
  };
}

export function signingCompletedEmail(opts: {
  contractTitle: string;
  recipientName: string;
}) {
  return {
    subject: `Contrato firmado: ${opts.contractTitle}`,
    body: `<p>Hola ${opts.recipientName},</p>
<p>El contrato <strong>${opts.contractTitle}</strong> fue firmado por todas las partes.</p>
<p>Puedes consultarlo en el panel de contratos de Pime.</p>`,
  };
}
