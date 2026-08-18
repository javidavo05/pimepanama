import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { bookingTimezone } from "@/lib/pimebook/config";
import { ensureDefaultBookingSetup } from "@/lib/pimebook/slots";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    await ensureDefaultBookingSetup(user.id);

    const [eventTypes, availability, config, mailAccounts] = await Promise.all([
      prisma.bookingEventType.findMany({ where: { userId: user.id }, orderBy: { title: "asc" } }),
      prisma.bookingAvailability.findMany({ where: { userId: user.id }, orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }),
      prisma.companyConfig.findFirst({ where: { id: user.configId ?? undefined } }),
      prisma.mailAccount.findMany({
        where: { userId: user.id },
        select: { id: true, label: true, username: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      eventTypes,
      availability,
      bookingAutoLead: config?.bookingAutoLead ?? true,
      signingMailAccountId: config?.signingMailAccountId ?? null,
      mailAccounts,
      timezone: bookingTimezone(),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = (await request.json()) as {
      eventTypes?: Array<{
        id?: string;
        slug: string;
        title: string;
        durationMin: number;
        bufferMin?: number;
        description?: string;
        active?: boolean;
      }>;
      availability?: Array<{
        id?: string;
        weekday: number;
        startTime: string;
        endTime: string;
      }>;
      bookingAutoLead?: boolean;
      signingMailAccountId?: string | null;
    };

    if (
      (body.bookingAutoLead !== undefined || body.signingMailAccountId !== undefined) &&
      user.configId
    ) {
      await prisma.companyConfig.update({
        where: { id: user.configId },
        data: {
          ...(body.bookingAutoLead !== undefined ? { bookingAutoLead: body.bookingAutoLead } : {}),
          ...(body.signingMailAccountId !== undefined
            ? { signingMailAccountId: body.signingMailAccountId || null }
            : {}),
        },
      });
    }

    if (body.eventTypes) {
      for (const et of body.eventTypes) {
        if (et.id) {
          await prisma.bookingEventType.update({
            where: { id: et.id, userId: user.id },
            data: {
              slug: et.slug,
              title: et.title,
              durationMin: et.durationMin,
              bufferMin: et.bufferMin ?? 10,
              description: et.description,
              active: et.active ?? true,
            },
          });
        } else {
          await prisma.bookingEventType.create({
            data: {
              userId: user.id,
              slug: et.slug,
              title: et.title,
              durationMin: et.durationMin,
              bufferMin: et.bufferMin ?? 10,
              description: et.description,
              active: et.active ?? true,
            },
          });
        }
      }
    }

    if (body.availability) {
      await prisma.bookingAvailability.deleteMany({ where: { userId: user.id } });
      for (const a of body.availability) {
        await prisma.bookingAvailability.create({
          data: {
            userId: user.id,
            weekday: a.weekday,
            startTime: a.startTime,
            endTime: a.endTime,
            timezone: bookingTimezone(),
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
