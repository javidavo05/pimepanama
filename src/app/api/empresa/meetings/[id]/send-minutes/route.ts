import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { assertResendConfigured, sendMailFromAccount } from "@/lib/mail/mail-send";
import { persistSentEmail } from "@/lib/mail/persist-sent-email";
import { parseMailAddressList, validateMailAddressList } from "@/lib/mail/validate-address";
import { minutesEmailBody, minutesEmailSubject } from "@/lib/meetings/minutes-email";
import { parseAttendees, type ExecutiveMinutes } from "@/lib/meetings/types";

export const runtime = "nodejs";

/**
 * Envía la minuta ejecutiva al cliente. Es el paso que faltaba para que la
 * reunión termine de verdad: hasta ahora la minuta se quedaba dentro del panel y
 * había que copiarla a mano a un correo.
 *
 * El envío sale por la cuenta de correo del Mail Hub, así que la conversación
 * queda archivada en Enviados como cualquier otro correo del sistema.
 */
export const POST = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    include: {
      project: { select: { name: true } },
      client: { select: { name: true, email: true } },
      actionItems: {
        orderBy: { sortOrder: "asc" },
        select: { title: true, owner: true, dueDate: true },
      },
    },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const executive = meeting.executiveMinutes as unknown as ExecutiveMinutes | null;
  if (!executive) {
    return NextResponse.json(
      { error: "Genera primero la minuta ejecutiva." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const to = (typeof body.to === "string" ? body.to : meeting.client?.email ?? "").trim();
  if (!to) {
    return NextResponse.json(
      { error: "No hay a quién enviarle: el cliente de la reunión no tiene correo." },
      { status: 400 }
    );
  }
  const toCheck = validateMailAddressList(to, "Para");
  if (!toCheck.ok) return NextResponse.json({ error: toCheck.error }, { status: 400 });

  const cc = typeof body.cc === "string" ? body.cc.trim() : "";
  if (cc) {
    const ccCheck = validateMailAddressList(cc, "CC");
    if (!ccCheck.ok) return NextResponse.json({ error: ccCheck.error }, { status: 400 });
  }

  const account = body.accountId
    ? await prisma.mailAccount.findFirst({
        where: { id: String(body.accountId), userId: user.id, active: true },
      })
    : await prisma.mailAccount.findFirst({
        where: { userId: user.id, active: true },
        orderBy: { createdAt: "asc" },
      });
  if (!account) {
    return NextResponse.json(
      { error: "No hay una cuenta de correo activa configurada en el Mail Hub." },
      { status: 400 }
    );
  }
  assertResendConfigured();

  const input = {
    title: meeting.title,
    meetingDate: meeting.meetingDate,
    executive,
    attendees: parseAttendees(meeting.attendees),
    actionItems: meeting.actionItems,
    projectName: meeting.project?.name ?? null,
  };

  // El usuario puede reescribir asunto y cuerpo antes de enviar; si no toca
  // nada, va la minuta redactada tal cual.
  const subject =
    typeof body.subject === "string" && body.subject.trim()
      ? body.subject.trim()
      : minutesEmailSubject(input);
  const html =
    typeof body.body === "string" && body.body.trim() ? body.body : minutesEmailBody(input);

  const config = user.configId
    ? await prisma.companyConfig.findFirst({ where: { id: user.configId } })
    : null;

  const result = await sendMailFromAccount({
    account,
    config,
    to,
    cc: cc || undefined,
    subject,
    body: html,
  });

  const sent = await persistSentEmail({
    account,
    userId: user.id,
    config,
    subject,
    body: html,
    toAddresses: toCheck.addresses,
    ccAddresses: cc ? parseMailAddressList(cc) : [],
    messageId: result.messageId,
    resendId: result.resendId,
    attachments: [],
    smtpAccepted: result.accepted.map(String),
    smtpRejected: result.rejected.map(String),
    smtpResponse: result.response,
  });

  await prisma.meeting.update({ where: { id }, data: { minutesSentAt: new Date() } });

  return NextResponse.json({ ok: true, sentEmailId: sent.id, to, subject });
});

/** Vista previa: el borrador que se va a enviar, para poder revisarlo antes. */
export const GET = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    include: {
      project: { select: { name: true } },
      client: { select: { name: true, email: true } },
      actionItems: {
        orderBy: { sortOrder: "asc" },
        select: { title: true, owner: true, dueDate: true },
      },
    },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const executive = meeting.executiveMinutes as unknown as ExecutiveMinutes | null;
  if (!executive) {
    return NextResponse.json({ error: "Genera primero la minuta ejecutiva." }, { status: 400 });
  }

  const input = {
    title: meeting.title,
    meetingDate: meeting.meetingDate,
    executive,
    attendees: parseAttendees(meeting.attendees),
    actionItems: meeting.actionItems,
    projectName: meeting.project?.name ?? null,
  };

  const accounts = await prisma.mailAccount.findMany({
    where: { userId: user.id, active: true },
    select: { id: true, label: true, username: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    to: meeting.client?.email ?? "",
    clientName: meeting.client?.name ?? null,
    subject: minutesEmailSubject(input),
    body: minutesEmailBody(input),
    accounts,
    sentAt: meeting.minutesSentAt?.toISOString() ?? null,
  });
});
