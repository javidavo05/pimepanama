import { prisma } from "@/lib/prisma";
import { sendMailFromAccount } from "@/lib/mail/mail-send";
import { siteUrl } from "./config";

async function getMailAccount(userId: string) {
  return prisma.mailAccount.findFirst({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendBookingConfirmationEmail(opts: {
  userId: string;
  booking: {
    attendeeName: string;
    attendeeEmail: string;
    startTime: Date;
    endTime: Date;
    eventType: { title: string };
  };
}) {
  const account = await getMailAccount(opts.userId);
  if (!account) return;

  const config = await prisma.companyConfig.findFirst({
    where: { users: { some: { id: opts.userId } } },
  });

  const when = opts.booking.startTime.toLocaleString("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Panama",
  });

  await sendMailFromAccount({
    account,
    config,
    to: opts.booking.attendeeEmail,
    subject: `Cita confirmada: ${opts.booking.eventType.title}`,
    body: `<p>Hola ${opts.booking.attendeeName},</p>
<p>Tu cita <strong>${opts.booking.eventType.title}</strong> quedó confirmada para el <strong>${when}</strong>.</p>
<p>Si necesitas reprogramar, contáctanos.</p>
<p><a href="${siteUrl()}">${config?.name ?? "Pime Panamá"}</a></p>`,
  });
}
