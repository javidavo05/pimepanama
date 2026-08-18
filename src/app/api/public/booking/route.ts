import { NextResponse } from "next/server";
import { createBooking } from "@/lib/pimebook/book";
import { ensureDefaultBookingSetup, resolveBookingOwnerUserId } from "@/lib/pimebook/slots";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      eventType?: string;
      startTime?: string;
      attendeeName?: string;
      attendeeEmail?: string;
      attendeePhone?: string;
      notes?: string;
      leadId?: string;
    };

    if (!body.startTime || !body.attendeeName?.trim() || !body.attendeeEmail?.trim()) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const userId = await resolveBookingOwnerUserId();
    await ensureDefaultBookingSetup(userId);

    const booking = await createBooking({
      userId,
      eventTypeSlug: body.eventType || "consulta",
      startTime: new Date(body.startTime),
      attendeeName: body.attendeeName,
      attendeeEmail: body.attendeeEmail,
      attendeePhone: body.attendeePhone,
      notes: body.notes,
      leadId: body.leadId,
      source: body.leadId ? "LEAD_LINK" : "PUBLIC",
    });

    return NextResponse.json({
      ok: true,
      booking: {
        id: booking.id,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al reservar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
