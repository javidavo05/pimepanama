import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const status = new URL(request.url).searchParams.get("status");

    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as "CONFIRMED" | "CANCELLED" | "RESCHEDULED" } : {}),
      },
      include: {
        eventType: { select: { title: true, slug: true, durationMin: true } },
        lead: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "desc" },
      take: 100,
    });

    return NextResponse.json({ bookings });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
