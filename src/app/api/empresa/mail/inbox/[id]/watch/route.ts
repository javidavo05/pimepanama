import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { findWatchForEmail, serializeWatch, watchThread } from "@/lib/mail/watch";

export const runtime = "nodejs";

async function loadEmail(userId: string, id: string) {
  return prisma.inboxEmail.findFirst({
    where: { id, userId },
    include: { account: { select: { label: true, username: true } } },
  });
}

/** Marca la conversación como importante: avisa cuando llegue una respuesta. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const email = await loadEmail(user.id, id);
    if (!email) return NextResponse.json({ error: "Correo no encontrado" }, { status: 404 });

    const watch = await watchThread(user.id, email);
    return NextResponse.json({ watch: serializeWatch(watch) });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[mail-watch] no se pudo marcar el hilo", err);
    return NextResponse.json({ error: "No se pudo marcar la conversación" }, { status: 500 });
  }
}

/** Deja de seguir la conversación. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const email = await loadEmail(user.id, id);
    if (!email) return NextResponse.json({ error: "Correo no encontrado" }, { status: 404 });

    const watches = await prisma.watchedThread.findMany({ where: { userId: user.id } });
    const watch = findWatchForEmail(email, watches, email.account.username);
    if (watch) await prisma.watchedThread.delete({ where: { id: watch.id } });
    return NextResponse.json({ watch: null });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[mail-watch] no se pudo desmarcar el hilo", err);
    return NextResponse.json({ error: "No se pudo quitar la marca" }, { status: 500 });
  }
}
