import type { InboxEmail, WatchedThread } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications/notify";
import { mailBodyPreview } from "./body-format";
import {
  extractEmailAddress,
  findThreadEmails,
  getCounterpartAddresses,
  normalizeSubject,
} from "./thread";

/** Estado de seguimiento que ve la UI. null = la conversación no está marcada. */
export type WatchStatus = {
  id: string;
  createdAt: string;
  replyCount: number;
  lastReplyAt: string | null;
  lastReplyEmailId: string | null;
} | null;

export function serializeWatch(watch: WatchedThread | null): WatchStatus {
  if (!watch) return null;
  return {
    id: watch.id,
    createdAt: watch.createdAt.toISOString(),
    replyCount: watch.replyCount,
    lastReplyAt: watch.lastReplyAt?.toISOString() ?? null,
    lastReplyEmailId: watch.lastReplyEmailId,
  };
}

/**
 * Dominios de correo gratuito: ahí dos personas del mismo dominio no son la
 * misma organización, así que solo casamos por dirección exacta.
 */
const FREEMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com",
  "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
]);

function domainOf(address: string): string | null {
  const at = address.lastIndexOf("@");
  return at > 0 ? address.slice(at + 1) : null;
}

/**
 * ¿La dirección pertenece a la contraparte del hilo? Exacta, o del mismo
 * dominio corporativo: en un RFP suele contestar alguien de compras que no
 * estaba en el primer correo.
 */
function isParticipant(address: string, participants: string[]): boolean {
  const addr = extractEmailAddress(address);
  if (!addr) return false;
  if (participants.includes(addr)) return true;
  const domain = domainOf(addr);
  if (!domain || FREEMAIL_DOMAINS.has(domain)) return false;
  return participants.some((p) => domainOf(p) === domain);
}

function referencedIds(email: Pick<InboxEmail, "inReplyTo" | "referencesHeader">): string[] {
  return [email.inReplyTo ?? "", ...(email.referencesHeader ?? "").split(/\s+/)]
    .map((id) => id.trim())
    .filter(Boolean);
}

type MatchableEmail = Pick<
  InboxEmail,
  "id" | "subject" | "folder" | "fromEmail" | "toAddresses" | "inReplyTo" | "referencesHeader"
>;

/** ¿El correo es parte de la conversación marcada? No mira fechas. */
export function emailBelongsToWatch(
  email: MatchableEmail,
  watch: Pick<WatchedThread, "emailId" | "normSubject" | "participants" | "messageIds">,
  accountUsername: string
): boolean {
  if (email.id === watch.emailId) return true;

  const refs = referencedIds(email);
  if (refs.some((id) => watch.messageIds.includes(id))) return true;

  if (!watch.normSubject || normalizeSubject(email.subject) !== watch.normSubject) return false;
  const counterparts = getCounterpartAddresses(email, accountUsername);
  return counterparts.some((addr) => isParticipant(addr, watch.participants));
}

export function findWatchForEmail<W extends Pick<WatchedThread, "emailId" | "normSubject" | "participants" | "messageIds">>(
  email: MatchableEmail,
  watches: W[],
  accountUsername: string
): W | null {
  return watches.find((w) => emailBelongsToWatch(email, w, accountUsername)) ?? null;
}

/**
 * Marca la conversación del correo como importante. Si el hilo ya estaba
 * marcado (desde otro mensaje del mismo hilo), devuelve esa marca.
 */
export async function watchThread(
  userId: string,
  email: InboxEmail & { account: { label: string; username: string } }
): Promise<WatchedThread> {
  const existing = await prisma.watchedThread.findMany({ where: { userId } });
  const already = findWatchForEmail(email, existing, email.account.username);
  if (already) return already;

  const messages = await findThreadEmails(userId, email);
  const thread = messages.length > 0 ? messages : [email];
  const participants = new Set<string>();
  for (const msg of thread) {
    for (const addr of getCounterpartAddresses(msg, msg.account.username)) {
      if (addr) participants.add(addr);
    }
  }

  return prisma.watchedThread.create({
    data: {
      userId,
      emailId: email.id,
      subject: email.subject,
      normSubject: normalizeSubject(email.subject),
      participants: [...participants],
      messageIds: thread.map((m) => m.messageId).filter((id): id is string => !!id),
      lastMessageAt: new Date(Math.max(...thread.map((m) => m.receivedAt.getTime()))),
    },
  });
}

/**
 * Llamar con cada correo recién guardado. Si pertenece a un hilo marcado,
 * actualiza la marca y, si es una respuesta entrante, avisa.
 *
 * `watches` es la lista cargada una vez por sync y se muta en memoria, así un
 * lote con varias respuestas no relee la tabla por cada correo.
 *
 * Devuelve true si avisó (para no duplicar con el aviso genérico de urgencia).
 * Nunca lanza: el correo ya quedó guardado.
 */
export async function handleIncomingForWatches(
  email: InboxEmail,
  watches: WatchedThread[],
  accountUsername: string
): Promise<boolean> {
  try {
    const watch = findWatchForEmail(email, watches, accountUsername);
    if (!watch || email.receivedAt <= watch.lastMessageAt) return false;

    const isReply = email.folder === "INBOX" &&
      extractEmailAddress(email.fromEmail) !== extractEmailAddress(accountUsername);

    const from = extractEmailAddress(email.fromEmail);
    const participants = isReply && from && !watch.participants.includes(from)
      ? [...watch.participants, from]
      : watch.participants;
    const messageIds = email.messageId && !watch.messageIds.includes(email.messageId)
      ? [...watch.messageIds, email.messageId]
      : watch.messageIds;

    const updated = await prisma.watchedThread.update({
      where: { id: watch.id },
      data: {
        participants,
        messageIds,
        lastMessageAt: email.receivedAt,
        ...(isReply && {
          lastReplyAt: email.receivedAt,
          lastReplyEmailId: email.id,
          replyCount: { increment: 1 },
        }),
      },
    });
    Object.assign(watch, updated);

    if (!isReply) return false;

    const sender = email.fromName?.trim() || from;
    const preview = email.aiSummary ?? mailBodyPreview(email.bodyText, 160) ?? "Abre el correo para leerlo.";
    await notifyUser({
      userId: email.userId,
      title: `Respondieron: ${email.subject ?? watch.subject ?? "(Sin asunto)"}`,
      body: `${sender}: ${preview}`,
      link: `/empresa/correos/hub/${email.id}`,
      tag: `watch-${watch.id}`,
    });
    return true;
  } catch (err) {
    console.error("[mail-watch] no se pudo procesar el correo para hilos marcados", err);
    return false;
  }
}
