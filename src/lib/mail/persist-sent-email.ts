import type { CompanyConfig, MailAccount } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { putR2Object } from "@/lib/r2";
import type { MailOutgoingAttachment } from "./outgoing-attachments";
import { wrapBodyWithSignature } from "./signature";
import { buildThreadKey } from "./thread";
import { handleIncomingForWatches } from "./watch";

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
    // Se guarda una copia en R2 como con los correos recibidos: antes solo quedaba el nombre y al abrir el
    // adjunto desde Enviados salía «File not stored». Si R2 falla, el correo ya salió: se registra sin copia.
    const data = [];
    for (const att of params.attachments) {
      let r2Key: string | null = null;
      try {
        const key = `mail-attachments/${params.userId}/sent/${randomUUID()}-${att.filename}`;
        await putR2Object(key, att.content, att.contentType);
        r2Key = key;
      } catch (err) {
        console.error("[persistSentEmail] no se pudo guardar el adjunto en R2", att.filename, err);
      }
      data.push({ emailId: sentEmail.id, filename: att.filename, contentType: att.contentType, size: att.content.length, r2Key });
    }
    await prisma.emailAttachment.createMany({ data });
  }

  // Si el hilo está marcado, su Message-ID queda registrado: la respuesta a
  // este envío casa por In-Reply-To aunque la otra parte cambie el asunto.
  const watches = await prisma.watchedThread
    .findMany({ where: { userId: params.userId } })
    .catch(() => []);
  if (watches.length > 0) {
    await handleIncomingForWatches(sentEmail, watches, params.account.username);
  }

  return sentEmail;
}
