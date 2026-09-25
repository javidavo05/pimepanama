import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireDeviceUser } from "@/lib/devices/tokens";
import { prisma } from "@/lib/prisma";
import { buildEmailSrcDoc } from "@/lib/mail/email-html";
import { normalizeMailBodyHtml } from "@/lib/mail/body-format";
import { findWatchForEmail } from "@/lib/mail/watch";

export const runtime = "nodejs";

/**
 * Un correo completo para leerlo en la barra de menú de la Mac. Abrirlo lo
 * marca como leído, igual que en el hub.
 *
 * Las imágenes externas van sin el proxy del hub (ese pide la cookie): la app
 * las bloquea hasta que el usuario pide cargarlas, así un píxel de rastreo no
 * avisa que se abrió.
 */
export const GET = withEmpresaIdRoute(async (request, { params }) => {
  const user = await requireDeviceUser(request);
  const { id } = await params;

  const email = await prisma.inboxEmail.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true, subject: true, fromName: true, fromEmail: true, toAddresses: true,
      ccAddresses: true, receivedAt: true, isRead: true, isStarred: true, aiSummary: true,
      bodyText: true, folder: true, inReplyTo: true, referencesHeader: true,
      account: { select: { label: true, username: true } },
      attachments: { select: { id: true, filename: true, size: true } },
    },
  });
  if (!email) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const [, watches] = await Promise.all([
    email.isRead
      ? Promise.resolve(null)
      : prisma.inboxEmail.update({ where: { id }, data: { isRead: true } }),
    prisma.watchedThread.findMany({ where: { userId: user.id } }),
  ]);

  const body = normalizeMailBodyHtml(email.bodyText ?? "");

  return NextResponse.json({
    id: email.id,
    subject: email.subject?.trim() || "(sin asunto)",
    fromName: email.fromName?.trim() || null,
    fromEmail: email.fromEmail,
    to: email.toAddresses,
    cc: email.ccAddresses,
    receivedAt: email.receivedAt.toISOString(),
    isStarred: email.isStarred,
    isWatched: watches.length > 0 && !!findWatchForEmail(email, watches, email.account.username),
    summary: email.aiSummary,
    account: email.account.label,
    html: body ? buildEmailSrcDoc(body, { proxyImages: false }) : null,
    attachments: email.attachments,
    path: `/empresa/correos/hub/${email.id}`,
  });
});
