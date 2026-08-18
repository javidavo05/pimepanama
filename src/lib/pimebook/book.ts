import type { BookingSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "./config";
import { sendBookingConfirmationEmail } from "./notify";
import { syncBookingToCrm } from "./sync-crm";

export async function createBooking(opts: {
  userId: string;
  eventTypeSlug: string;
  startTime: Date;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  notes?: string;
  leadId?: string;
  source?: BookingSource;
}) {
  const eventType = await prisma.bookingEventType.findFirst({
    where: { userId: opts.userId, slug: opts.eventTypeSlug, active: true },
  });
  if (!eventType) throw new Error("Tipo de cita no encontrado.");

  const endTime = new Date(opts.startTime.getTime() + eventType.durationMin * 60 * 1000);

  const conflict = await prisma.booking.findFirst({
    where: {
      userId: opts.userId,
      status: "CONFIRMED",
      startTime: opts.startTime,
    },
  });
  if (conflict) throw new Error("Ese horario ya no está disponible.");

  const booking = await prisma.booking.create({
    data: {
      userId: opts.userId,
      eventTypeId: eventType.id,
      leadId: opts.leadId || undefined,
      attendeeName: opts.attendeeName.trim(),
      attendeeEmail: opts.attendeeEmail.trim().toLowerCase(),
      attendeePhone: opts.attendeePhone?.trim(),
      notes: opts.notes?.trim(),
      startTime: opts.startTime,
      endTime,
      source: opts.source ?? "PUBLIC",
      status: "CONFIRMED",
    },
    include: { eventType: true },
  });

  const { taskId, leadId } = await syncBookingToCrm(booking);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { taskId: taskId ?? undefined, leadId: leadId ?? booking.leadId },
    include: { eventType: true },
  });

  await sendBookingConfirmationEmail({
    userId: opts.userId,
    booking: updated,
  }).catch(() => {});

  return updated;
}

export async function cancelBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: { task: true },
  });
  if (!booking) throw new Error("Cita no encontrada.");

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
    if (booking.taskId) {
      await tx.task.update({
        where: { id: booking.taskId },
        data: { completed: true, completedAt: new Date() },
      });
    }
  });

  return { ok: true };
}

export function bookingPublicUrl(slug?: string, query?: Record<string, string>) {
  const base = `${siteUrl()}/agendar`;
  const params = new URLSearchParams(query);
  if (slug) params.set("type", slug);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}
