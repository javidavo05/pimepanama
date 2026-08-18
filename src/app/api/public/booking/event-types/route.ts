import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveBookingOwnerUserId, ensureDefaultBookingSetup } from "@/lib/pimebook/slots";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await resolveBookingOwnerUserId();
    await ensureDefaultBookingSetup(userId);
    const types = await prisma.bookingEventType.findMany({
      where: { userId, active: true },
      orderBy: { title: "asc" },
      select: {
        slug: true,
        title: true,
        durationMin: true,
        description: true,
      },
    });
    return NextResponse.json({ eventTypes: types });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
