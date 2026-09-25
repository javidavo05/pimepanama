import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireDeviceUser } from "@/lib/devices/tokens";
import { prisma } from "@/lib/prisma";
import { findWatchForEmail } from "@/lib/mail/watch";

export const runtime = "nodejs";

/** Cuánto hacia atrás se buscan importantes: lo marcado hace meses ya no apura. */
const IMPORTANT_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;
const IMPORTANT_LIMIT = 8;
const UNREAD_LIMIT = 10;

const EMAIL_SELECT = {
  id: true, subject: true, fromName: true, fromEmail: true, toAddresses: true,
  receivedAt: true, isRead: true, isStarred: true, aiSummary: true, folder: true,
  inReplyTo: true, referencesHeader: true,
  account: { select: { label: true, username: true } },
} as const;

/**
 * Resumen de la bandeja para la barra de menú de la Mac: primero lo marcado
 * como importante (conversaciones vigiladas y destacados), después lo que falta
 * leer. Los correos los baja el cron mail-watch cada 10 minutos.
 */
export const GET = withEmpresaRoute(async (request) => {
  const user = await requireDeviceUser(request);

  const [unread, watches] = await Promise.all([
    prisma.inboxEmail.count({ where: { userId: user.id, isRead: false, folder: "INBOX" } }),
    prisma.watchedThread.findMany({ where: { userId: user.id } }),
  ]);

  // Igual que el filtro "Importantes" del hub: la base trae candidatos por
  // asunto o por el correo marcado, y el casado fino se hace aquí.
  const watchCandidates = watches.flatMap((w) => [
    { id: w.emailId },
    ...(w.normSubject ? [{ subject: { contains: w.normSubject, mode: "insensitive" as const } }] : []),
  ]);

  const [candidates, unreadEmails] = await Promise.all([
    prisma.inboxEmail.findMany({
      where: {
        userId: user.id,
        folder: "INBOX",
        receivedAt: { gte: new Date(Date.now() - IMPORTANT_WINDOW_MS) },
        OR: [{ isStarred: true }, ...watchCandidates],
      },
      select: EMAIL_SELECT,
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
    prisma.inboxEmail.findMany({
      where: { userId: user.id, folder: "INBOX", isRead: false },
      select: EMAIL_SELECT,
      orderBy: { receivedAt: "desc" },
      take: UNREAD_LIMIT + IMPORTANT_LIMIT,
    }),
  ]);

  const isWatched = (e: (typeof candidates)[number]) =>
    watches.length > 0 && !!findWatchForEmail(e, watches, e.account.username);

  const important = candidates
    .map((e) => ({ e, watched: isWatched(e) }))
    .filter(({ e, watched }) => watched || e.isStarred);
  // Sin leer arriba: es lo que pide respuesta.
  important.sort((a, b) => Number(a.e.isRead) - Number(b.e.isRead));

  const importantIds = new Set(important.map(({ e }) => e.id));
  const serialize = (e: (typeof candidates)[number], watched: boolean) => ({
    id: e.id,
    subject: e.subject?.trim() || "(sin asunto)",
    from: e.fromName?.trim() || e.fromEmail,
    receivedAt: e.receivedAt.toISOString(),
    isRead: e.isRead,
    isStarred: e.isStarred,
    isWatched: watched,
    summary: e.aiSummary ? e.aiSummary.slice(0, 180) : null,
    account: e.account.label,
    path: `/empresa/correos/hub/${e.id}`,
  });

  return NextResponse.json({
    unread,
    importantUnread: important.filter(({ e }) => !e.isRead).length,
    important: important.slice(0, IMPORTANT_LIMIT).map(({ e, watched }) => serialize(e, watched)),
    unreadOthers: unreadEmails
      .filter((e) => !importantIds.has(e.id))
      .slice(0, UNREAD_LIMIT)
      .map((e) => serialize(e, false)),
    user: { name: user.fullName ?? user.email },
  });
});
