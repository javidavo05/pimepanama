import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireDeviceUser } from "@/lib/devices/tokens";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Lo que la barra de menú necesita para preparar una grabación: proyectos y las últimas reuniones. */
export const GET = withEmpresaRoute(async (request) => {
  const user = await requireDeviceUser(request);

  const [projects, meetings] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "PAUSED"] } },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.meeting.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, status: true, meetingDate: true, durationMs: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  return NextResponse.json({
    projects,
    meetings: meetings.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      meetingDate: m.meetingDate.toISOString(),
      durationMs: m.durationMs,
      path: `/empresa/reuniones/${m.id}`,
    })),
  });
});
