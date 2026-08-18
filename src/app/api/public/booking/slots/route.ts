import { NextResponse } from "next/server";
import { computeAvailableSlots, ensureDefaultBookingSetup, resolveBookingOwnerUserId } from "@/lib/pimebook/slots";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("eventType") || url.searchParams.get("type") || "consulta";
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");

    const from = fromStr ? new Date(fromStr) : new Date();
    const to = toStr ? new Date(toStr) : new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);

    const userId = await resolveBookingOwnerUserId();
    await ensureDefaultBookingSetup(userId);

    const slots = await computeAvailableSlots({ userId, eventTypeSlug: slug, from, to });

    return NextResponse.json({
      slots: slots.map((s) => ({
        start: s.start,
        end: s.end,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
