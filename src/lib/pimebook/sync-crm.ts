import type { Booking, LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function syncBookingToCrm(booking: Booking) {
  let leadId = booking.leadId;
  const config = await prisma.companyConfig.findFirst({
    where: { users: { some: { id: booking.userId } } },
  });

  if (!leadId && config?.bookingAutoLead !== false) {
    const existing = await prisma.lead.findFirst({
      where: {
        userId: booking.userId,
        email: { equals: booking.attendeeEmail, mode: "insensitive" },
      },
    });
    if (existing) {
      leadId = existing.id;
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          nextFollowUpAt: booking.startTime,
          status: existing.status === "NUEVO" ? "CONTACTADO" : existing.status,
        },
      });
    } else {
      const created = await prisma.lead.create({
        data: {
          userId: booking.userId,
          name: booking.attendeeName,
          email: booking.attendeeEmail,
          phone: booking.attendeePhone,
          source: "WEB",
          status: "CONTACTADO",
          nextFollowUpAt: booking.startTime,
          notes: `Cita agendada vía PimeBook (${booking.source})`,
        },
      });
      leadId = created.id;
    }
  } else if (leadId) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        nextFollowUpAt: booking.startTime,
        status: "CONTACTADO" as LeadStatus,
      },
    });
  }

  const task = await prisma.task.create({
    data: {
      userId: booking.userId,
      title: `Cita: ${booking.attendeeName}`,
      description: booking.notes ?? `Email: ${booking.attendeeEmail}`,
      dueDate: booking.startTime,
      endDate: booking.endTime,
      allDay: false,
      priority: "MEDIUM",
    },
  });

  return { leadId, taskId: task.id };
}
