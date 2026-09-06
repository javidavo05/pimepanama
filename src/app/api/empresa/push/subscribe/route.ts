import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { getVapidPublicKey } from "@/lib/notifications/push";

export const runtime = "nodejs";

/** Llave pública VAPID + si este dispositivo ya está suscrito. */
export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const publicKey = getVapidPublicKey();
    const endpoint = new URL(request.url).searchParams.get("endpoint");

    const subscribed = endpoint
      ? (await prisma.pushSubscription.count({ where: { userId: user.id, endpoint } })) > 0
      : false;

    return NextResponse.json({ publicKey, subscribed });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = (await request.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    const endpoint = body.endpoint?.trim();
    const p256dh = body.keys?.p256dh?.trim();
    const auth = body.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Suscripción incompleta" }, { status: 400 });
    }

    // El endpoint es único: si el navegador rota las llaves (o el PWA cambia de
    // dueño en un equipo compartido), se actualiza la fila en vez de duplicar.
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: user.id,
        endpoint,
        p256dh,
        auth,
        userAgent: request.headers.get("user-agent")?.slice(0, 255) ?? null,
      },
      update: {
        userId: user.id,
        p256dh,
        auth,
        userAgent: request.headers.get("user-agent")?.slice(0, 255) ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[push] error al guardar la suscripción", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
    const endpoint = body.endpoint?.trim();
    if (!endpoint) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });

    await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
