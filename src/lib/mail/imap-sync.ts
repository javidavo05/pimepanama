import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import { decryptPassword } from "./crypto";
import { analyzeEmail } from "./ai-analyze";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import type { MailAccount } from "@prisma/client";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function syncAccount(account: MailAccount): Promise<{ fetched: number }> {
  const password = decryptPassword(account.passwordEnc);

  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.tls,
    auth: { user: account.username, pass: password },
    logger: false,
  });

  await client.connect();

  let fetched = 0;

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Search since lastSyncAt or 30 days ago
      const since = account.lastSyncAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const searchResult = await client.search({ since });
      const uids: number[] = Array.isArray(searchResult) ? searchResult : [];

      for (const uid of uids) {
        // Skip if already stored
        const existing = await prisma.inboxEmail.findUnique({
          where: { accountId_uid_folder: { accountId: account.id, uid, folder: "INBOX" } },
        });
        if (existing) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg: any = await client.fetchOne(String(uid), { source: true });
        if (!msg?.source) continue;

        const parsed = await simpleParser(msg.source as Buffer);

        const fromAddr = Array.isArray(parsed.from?.value)
          ? parsed.from!.value[0]
          : { name: "", address: "" };
        const toAddresses = (parsed.to as { value: { address?: string }[] } | undefined)?.value?.map((a) => a.address ?? "").filter(Boolean) ?? [];
        const ccAddresses = (parsed.cc as { value: { address?: string }[] } | undefined)?.value?.map((a) => a.address ?? "").filter(Boolean) ?? [];

        // Upload attachments to R2
        const attachmentData: { filename: string; contentType: string; size: number; r2Key: string }[] = [];
        for (const att of parsed.attachments ?? []) {
          if (!att.content || att.size === 0) continue;
          const key = `mail-attachments/${account.userId}/${randomUUID()}-${att.filename ?? "file"}`;
          await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            Body: att.content,
            ContentType: att.contentType ?? "application/octet-stream",
          }));
          attachmentData.push({
            filename: att.filename ?? "attachment",
            contentType: att.contentType ?? "application/octet-stream",
            size: att.size ?? att.content.length,
            r2Key: key,
          });
        }

        // Store the HTML body when available; keep plain text as fallback for AI
        const bodyHtml = typeof parsed.html === "string" ? parsed.html : null;
        const bodyPlain = parsed.text ?? (bodyHtml ? bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");
        // bodyText stores HTML when available so the UI can render it properly
        const bodyText = bodyHtml ?? bodyPlain;

        // AI analysis
        let aiSummary: string | undefined;
        let aiTags: string[] = [];
        let urgency: string = "low";
        let shouldNotify = false;

        try {
          // Pass plain text to AI (strip HTML if we stored it)
          const textForAi = bodyPlain.slice(0, 2000);
          const analysis = await analyzeEmail(parsed.subject ?? "", textForAi);
          aiSummary = analysis.summary;
          aiTags = analysis.tags;
          urgency = analysis.urgency;
          shouldNotify = urgency === "high" || analysis.tags.includes("urgent") || analysis.tags.includes("payment");
        } catch { /* non-critical */ }

        const email = await prisma.inboxEmail.create({
          data: {
            accountId: account.id,
            userId: account.userId,
            uid,
            messageId: parsed.messageId,
            subject: parsed.subject,
            fromName: fromAddr.name ?? undefined,
            fromEmail: fromAddr.address ?? "",
            toAddresses,
            ccAddresses,
            bodyText: bodyText.slice(0, 50000),
            receivedAt: parsed.date ?? new Date(),
            aiSummary,
            aiTags,
            folder: "INBOX",
            attachments: {
              create: attachmentData,
            },
          },
        });

        if (shouldNotify) {
          await prisma.mailNotification.create({
            data: {
              userId: account.userId,
              emailId: email.id,
              title: `${urgency === "high" ? "🔴 Urgente" : "📧 Atención"}: ${parsed.subject ?? "Sin asunto"}`,
              body: aiSummary ?? `Correo de ${fromAddr.address}`,
            },
          });
        }

        fetched++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  await prisma.mailAccount.update({
    where: { id: account.id },
    data: { lastSyncAt: new Date() },
  });

  return { fetched };
}

export async function testConnection(
  host: string, port: number, tls: boolean, username: string, password: string
): Promise<{ ok: boolean; folders?: string[]; error?: string }> {
  const client = new ImapFlow({
    host, port, secure: tls,
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
    // ImapFlow attaches the server's full response in these fields
    const serverMsg: string = e.responseText ?? e.serverResponse ?? e.response ?? "";
    const baseMsg: string = err instanceof Error ? err.message : "Connection failed";

    let friendly = serverMsg || baseMsg;

    // Map common IMAP server responses to actionable messages
    const lower = friendly.toLowerCase();
    if (lower.includes("authentication failed") || lower.includes("authenticationfailed") || lower.includes("invalid credentials")) {
      friendly = "Credenciales incorrectas — verifica usuario y contraseña";
    } else if (lower.includes("application-specific password") || lower.includes("app password") || lower.includes("application specific")) {
      friendly = "Gmail requiere una contraseña de aplicación (Configuración → Seguridad → Contraseñas de aplicación)";
    } else if (lower.includes("command failed") && (host.includes("gmail") || host.includes("googlemail"))) {
      friendly = "Gmail rechazó la conexión — asegúrate de usar una contraseña de aplicación y que IMAP esté habilitado en Gmail";
    } else if (lower.includes("command failed") && host.includes("outlook")) {
      friendly = "Outlook rechazó la conexión — verifica que IMAP esté habilitado en la cuenta";
    } else if (lower.includes("econnrefused") || lower.includes("econnreset") || lower.includes("etimedout")) {
      friendly = `No se pudo conectar a ${host}:${port} — verifica el servidor y puerto`;
    } else if (lower.includes("certificate") || lower.includes("ssl") || lower.includes("tls")) {
      friendly = `Error SSL/TLS con ${host} — intenta cambiar el puerto o desactivar TLS`;
    } else if (lower.includes("command failed")) {
      friendly = serverMsg ? `Servidor: ${serverMsg}` : "El servidor IMAP rechazó el comando — revisa las credenciales";
    }

    return { ok: false, error: friendly };
  }
}
