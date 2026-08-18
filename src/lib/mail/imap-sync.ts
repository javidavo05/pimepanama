import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import { decryptPassword } from "./crypto";
import { analyzeEmail } from "./ai-analyze";
import { isHtmlEmail, extractEmailHtml } from "./email-html";
import { assertR2Configured, putR2Object } from "@/lib/r2";
import { randomUUID } from "crypto";
import type { MailAccount } from "@prisma/client";
import {
  type CanonicalFolder,
  CANONICAL_FOLDERS,
  resolveImapPath,
} from "./folders";
import { buildThreadKey } from "./thread";

const MAX_PER_FOLDER = 200;
const BACKFILL_MAX_PER_FOLDER = 500;
const SYNC_DAYS = 30;
export const SENT_BACKFILL_DAYS = 90;

export type SyncOptions = {
  folders?: CanonicalFolder[];
  /** Override sync window — ignores lastSyncAt when set. */
  since?: Date;
  maxPerFolder?: number;
};

async function processMessage(
  account: MailAccount,
  uid: number,
  folder: CanonicalFolder,
  source: Buffer
): Promise<boolean> {
  const existing = await prisma.inboxEmail.findUnique({
    where: { accountId_uid_folder: { accountId: account.id, uid, folder } },
  });
  if (existing) return false;

  const parsed = await simpleParser(source);
  if (parsed.messageId) {
    const existingByMessageId = await prisma.inboxEmail.findFirst({
      where: { accountId: account.id, folder, messageId: parsed.messageId },
    });
    if (existingByMessageId) return false;
  }
  const bodyHtml = extractEmailHtml(parsed);
  const bodyPlain =
    parsed.text ??
    (bodyHtml ? bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");
  const bodyText = bodyHtml ?? bodyPlain;

  const fromAddr = Array.isArray(parsed.from?.value)
    ? parsed.from!.value[0]
    : { name: "", address: "" };
  const toAddresses =
    (parsed.to as { value: { address?: string }[] } | undefined)?.value
      ?.map((a) => a.address ?? "")
      .filter(Boolean) ?? [];
  const ccAddresses =
    (parsed.cc as { value: { address?: string }[] } | undefined)?.value
      ?.map((a) => a.address ?? "")
      .filter(Boolean) ?? [];

  const attachmentData: { filename: string; contentType: string; size: number; r2Key: string }[] = [];
  if (folder === "INBOX") {
    for (const att of parsed.attachments ?? []) {
      if (!att.content || att.size === 0) continue;
      const key = `mail-attachments/${account.userId}/${randomUUID()}-${att.filename ?? "file"}`;
      await putR2Object(key, att.content as Buffer, att.contentType ?? "application/octet-stream");
      attachmentData.push({
        filename: att.filename ?? "attachment",
        contentType: att.contentType ?? "application/octet-stream",
        size: att.size ?? att.content.length,
        r2Key: key,
      });
    }
  }

  let aiSummary: string | undefined;
  let aiTags: string[] = [];
  let urgency = "low";
  let shouldNotify = false;

  if (folder === "INBOX") {
    try {
      const textForAi = bodyPlain.slice(0, 2000);
      const analysis = await analyzeEmail(parsed.subject ?? "", textForAi);
      aiSummary = analysis.summary;
      aiTags = analysis.tags;
      urgency = analysis.urgency;
      shouldNotify =
        urgency === "high" ||
        analysis.tags.includes("urgent") ||
        analysis.tags.includes("payment");
    } catch {
      /* non-critical */
    }
  }

  const inReplyTo = typeof parsed.inReplyTo === "string" ? parsed.inReplyTo : undefined;
  const referencesHeader = Array.isArray(parsed.references)
    ? parsed.references.join(" ")
    : typeof parsed.references === "string"
      ? parsed.references
      : undefined;
  const fromEmail = fromAddr.address ?? "";
  const threadKey = buildThreadKey({
    subject: parsed.subject,
    accountUsername: account.username,
    fromEmail,
    toAddresses,
    folder,
  });

  const email = await prisma.inboxEmail.create({
    data: {
      accountId: account.id,
      userId: account.userId,
      uid,
      messageId: parsed.messageId,
      inReplyTo,
      referencesHeader,
      threadKey,
      subject: parsed.subject,
      fromName: fromAddr.name ?? undefined,
      fromEmail,
      toAddresses,
      ccAddresses,
      bodyText: bodyText.slice(0, 50000),
      receivedAt: parsed.date ?? new Date(),
      aiSummary,
      aiTags,
      folder,
      attachments: attachmentData.length > 0 ? { create: attachmentData } : undefined,
    },
  });

  if (shouldNotify) {
    await prisma.mailNotification.create({
      data: {
        userId: account.userId,
        emailId: email.id,
        title: `${urgency === "high" ? "Urgente" : "Atención"}: ${parsed.subject ?? "Sin asunto"}`,
        body: aiSummary ?? `Correo de ${fromAddr.address}`,
      },
    });
  }

  return true;
}

async function syncFolder(
  client: ImapFlow,
  account: MailAccount,
  imapPath: string,
  canonical: CanonicalFolder,
  since: Date,
  maxPerFolder: number
): Promise<number> {
  let fetched = 0;
  const lock = await client.getMailboxLock(imapPath);
  try {
    const searchResult = await client.search({ since });
    let uids: number[] = Array.isArray(searchResult) ? searchResult : [];
    if (uids.length > maxPerFolder) {
      uids = uids.slice(-maxPerFolder);
    }

    for (const uid of uids) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg: any = await client.fetchOne(String(uid), { source: true });
      if (!msg?.source) continue;
      const added = await processMessage(account, uid, canonical, msg.source as Buffer);
      if (added) fetched++;
    }
  } finally {
    lock.release();
  }
  return fetched;
}

export async function syncAccount(
  account: MailAccount,
  options?: SyncOptions
): Promise<{ fetched: number; folders: Record<string, number> }> {
  assertR2Configured();
  const password = decryptPassword(account.passwordEnc);

  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.tls,
    auth: { user: account.username, pass: password },
    logger: false,
  });

  await client.connect();

  const foldersToSync = options?.folders ?? CANONICAL_FOLDERS;
  const since =
    options?.since ??
    account.lastSyncAt ??
    new Date(Date.now() - SYNC_DAYS * 24 * 60 * 60 * 1000);
  const maxPerFolder = options?.maxPerFolder ?? MAX_PER_FOLDER;
  const listed = (await client.list()).map((m) => m.path);
  const folderStats: Record<string, number> = {};
  let totalFetched = 0;

  try {
    for (const canonical of foldersToSync) {
      const imapPath = resolveImapPath(canonical, listed);
      if (!imapPath) continue;
      try {
        const n = await syncFolder(client, account, imapPath, canonical, since, maxPerFolder);
        folderStats[canonical] = n;
        totalFetched += n;
      } catch {
        folderStats[canonical] = 0;
      }
    }
  } finally {
    await client.logout();
  }

  await prisma.mailAccount.update({
    where: { id: account.id },
    data: { lastSyncAt: new Date() },
  });

  return { fetched: totalFetched, folders: folderStats };
}

/** Import sent mail from the mail server (IMAP Sent folder), ignoring lastSyncAt. */
export async function backfillSentFolder(
  account: MailAccount,
  sinceDays = SENT_BACKFILL_DAYS
): Promise<{ fetched: number; folders: Record<string, number> }> {
  return syncAccount(account, {
    folders: ["SENT"],
    since: new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000),
    maxPerFolder: BACKFILL_MAX_PER_FOLDER,
  });
}

export type ResyncBodiesResult = {
  scanned: number;
  upgraded: number;
  failed: number;
  notFound: number;
  noHtml: number;
};

/** Re-fetch stored messages by IMAP UID and replace plain-text bodies with HTML. */
export async function resyncEmailBodies(
  account: MailAccount,
  options?: { emailId?: string; limit?: number }
): Promise<ResyncBodiesResult> {
  const password = decryptPassword(account.passwordEnc);
  const limit = options?.limit ?? 100;

  const candidates = await prisma.inboxEmail.findMany({
    where: {
      accountId: account.id,
      folder: "INBOX",
      ...(options?.emailId ? { id: options.emailId } : {}),
    },
    orderBy: { receivedAt: "desc" },
    take: options?.emailId ? 1 : limit,
    select: { id: true, uid: true, bodyText: true },
  });

  const toUpgrade = candidates.filter((e) => e.bodyText && !isHtmlEmail(e.bodyText));
  const result: ResyncBodiesResult = {
    scanned: toUpgrade.length,
    upgraded: 0,
    failed: 0,
    notFound: 0,
    noHtml: 0,
  };

  if (toUpgrade.length === 0) return result;

  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.tls,
    auth: { user: account.username, pass: password },
    logger: false,
  });

  await client.connect();

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      for (const email of toUpgrade) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msg: any = await client.fetchOne(String(email.uid), { source: true });
          if (!msg?.source) {
            result.notFound++;
            continue;
          }

          const parsed = await simpleParser(msg.source as Buffer);
          const bodyHtml = extractEmailHtml(parsed);
          if (!bodyHtml) {
            result.noHtml++;
            continue;
          }

          await prisma.inboxEmail.update({
            where: { id: email.id },
            data: { bodyText: bodyHtml.slice(0, 50000) },
          });
          result.upgraded++;
        } catch {
          result.failed++;
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return result;
}

export async function testConnection(
  host: string,
  port: number,
  tls: boolean,
  username: string,
  password: string
): Promise<{ ok: boolean; folders?: string[]; error?: string }> {
  const client = new ImapFlow({
    host,
    port,
    secure: tls,
    auth: { user: username, pass: password },
    logger: false,
  });

  try {
    await client.connect();
    const mailboxes = await client.list();
    const folders = mailboxes.map((m) => m.path).slice(0, 20);
    await client.logout();
    return { ok: true, folders };
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    const serverMsg: string = e.responseText ?? e.serverResponse ?? e.response ?? "";
    const baseMsg: string = err instanceof Error ? err.message : "Connection failed";

    let friendly = serverMsg || baseMsg;
    const lower = friendly.toLowerCase();
    if (
      lower.includes("authentication failed") ||
      lower.includes("authenticationfailed") ||
      lower.includes("invalid credentials")
    ) {
      friendly = "Credenciales incorrectas — verifica usuario y contraseña";
    } else if (
      lower.includes("application-specific password") ||
      lower.includes("app password") ||
      lower.includes("application specific")
    ) {
      friendly =
        "Gmail requiere una contraseña de aplicación (Configuración → Seguridad → Contraseñas de aplicación)";
    } else if (lower.includes("command failed") && (host.includes("gmail") || host.includes("googlemail"))) {
      friendly =
        "Gmail rechazó la conexión — asegúrate de usar una contraseña de aplicación y que IMAP esté habilitado en Gmail";
    } else if (lower.includes("command failed") && host.includes("outlook")) {
      friendly = "Outlook rechazó la conexión — verifica que IMAP esté habilitado en la cuenta";
    } else if (
      lower.includes("econnrefused") ||
      lower.includes("econnreset") ||
      lower.includes("etimedout")
    ) {
      friendly = `No se pudo conectar a ${host}:${port} — verifica el servidor y puerto`;
    } else if (lower.includes("certificate") || lower.includes("ssl") || lower.includes("tls")) {
      friendly = `Error SSL/TLS con ${host} — intenta cambiar el puerto o desactivar TLS`;
    } else if (lower.includes("command failed")) {
      friendly = serverMsg ? `Servidor: ${serverMsg}` : "El servidor IMAP rechazó el comando — revisa las credenciales";
    }

    return { ok: false, error: friendly };
  }
}
