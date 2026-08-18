import type { InboxEmail } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MailDeliveryStatus =
  | "ACCEPTED"
  | "REJECTED"
  | "BOUNCED"
  | "UNKNOWN"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "COMPLAINED";

export function normalizeSubject(subject: string | null | undefined): string {
  if (!subject) return "";
  let s = subject.trim();
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(/^(re|fwd|fw|res|rv|ant):\s*/i, "").trim();
  }
  return s.toLowerCase();
}

export function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] ?? raw).trim().toLowerCase();
}

export function inferDeliveryStatus(
  accepted: string[],
  rejected: string[]
): MailDeliveryStatus {
  if (rejected.length > 0) return "REJECTED";
  if (accepted.length > 0) return "ACCEPTED";
  return "UNKNOWN";
}

export function buildThreadKey(params: {
  subject: string | null | undefined;
  accountUsername: string;
  fromEmail: string;
  toAddresses: string[];
  folder: string;
}): string {
  const norm = normalizeSubject(params.subject);
  const own = extractEmailAddress(params.accountUsername);
  const participants = new Set<string>();

  participants.add(extractEmailAddress(params.fromEmail));
  for (const addr of params.toAddresses) {
    participants.add(extractEmailAddress(addr));
  }
  participants.delete(own);

  const others = [...participants].filter(Boolean).sort().join(",");
  return `${norm}::${others}`;
}

export function getCounterpartAddresses(
  email: Pick<InboxEmail, "folder" | "fromEmail" | "toAddresses">,
  accountUsername: string
): string[] {
  const own = extractEmailAddress(accountUsername);
  const from = extractEmailAddress(email.fromEmail);

  if (email.folder === "SENT") {
    return email.toAddresses.map(extractEmailAddress).filter((a) => a && a !== own);
  }

  if (from && from !== own) return [from];
  return email.toAddresses.map(extractEmailAddress).filter((a) => a && a !== own);
}

export type ThreadEmailRow = {
  id: string;
  folder: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string;
  toAddresses: string[];
  bodyText: string | null;
  receivedAt: Date;
  deliveryStatus: string | null;
  resendId: string | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  bouncedAt: Date | null;
  bounceReason: string | null;
  smtpAccepted: string[];
  smtpRejected: string[];
  messageId: string | null;
  account: { label: string; username: string };
};

export async function findThreadEmails(
  userId: string,
  email: InboxEmail & { account: { label: string; username: string } }
): Promise<ThreadEmailRow[]> {
  const threadKey =
    email.threadKey ??
    buildThreadKey({
      subject: email.subject,
      accountUsername: email.account.username,
      fromEmail: email.fromEmail,
      toAddresses: email.toAddresses,
      folder: email.folder,
    });

  const counterparts = getCounterpartAddresses(email, email.account.username);
  const normSubject = normalizeSubject(email.subject);

  const byKey = await prisma.inboxEmail.findMany({
    where: { userId, threadKey },
    orderBy: { receivedAt: "asc" },
    include: { account: { select: { label: true, username: true } } },
  });

  if (byKey.length > 1) return byKey;

  const candidates = await prisma.inboxEmail.findMany({
    where: {
      userId,
      OR: [
        { subject: { equals: email.subject ?? "", mode: "insensitive" } },
        ...(normSubject
          ? [
              { subject: { contains: normSubject, mode: "insensitive" as const } },
              { subject: { startsWith: `Re: ${normSubject}`, mode: "insensitive" as const } },
            ]
          : []),
      ],
    },
    orderBy: { receivedAt: "asc" },
    include: { account: { select: { label: true, username: true } } },
    take: 50,
  });

  const filtered = candidates.filter((msg) => {
    const msgCounterparts = getCounterpartAddresses(msg, msg.account.username);
    if (counterparts.length === 0 || msgCounterparts.length === 0) return false;
    const overlap = msgCounterparts.some((c) => counterparts.includes(c));
    if (!overlap) return false;
    if (normalizeSubject(msg.subject) !== normSubject && normSubject) {
      const msgNorm = normalizeSubject(msg.subject);
      if (msgNorm !== normSubject) return false;
    }
    return true;
  });

  const unique = new Map<string, ThreadEmailRow>();
  for (const row of [...byKey, ...filtered]) {
    unique.set(row.id, row);
  }

  const seedIds = new Set([email.id, ...unique.keys()]);
  const linkedReplies = await prisma.inboxEmail.findMany({
    where: {
      userId,
      repliedToEmailId: { in: [...seedIds] },
    },
    orderBy: { receivedAt: "asc" },
    include: { account: { select: { label: true, username: true } } },
  });
  for (const row of linkedReplies) {
    unique.set(row.id, row);
  }

  return [...unique.values()].sort(
    (a, b) => a.receivedAt.getTime() - b.receivedAt.getTime()
  );
}

export function threadSummary(messages: ThreadEmailRow[]) {
  const sent = messages.filter((m) => m.folder === "SENT");
  const received = messages.filter((m) => m.folder === "INBOX");
  const delivered = sent.filter((m) =>
    ["DELIVERED", "OPENED"].includes(m.deliveryStatus ?? "")
  ).length;
  const opened = sent.filter((m) => m.deliveryStatus === "OPENED").length;
  const bounced = sent.filter((m) => m.deliveryStatus === "BOUNCED").length;
  const pending = sent.filter((m) =>
    !m.deliveryStatus || ["SENT", "UNKNOWN", "ACCEPTED"].includes(m.deliveryStatus)
  ).length;

  return { sent: sent.length, received: received.length, delivered, opened, bounced, pending };
}
