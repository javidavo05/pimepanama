import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { encryptPassword } from "@/lib/mail/crypto";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const accounts = await prisma.mailAccount.findMany({
      where: { userId: user.id },
      select: {
        id: true, label: true, host: true, port: true, tls: true,
        username: true, credType: true, smtpHost: true, smtpPort: true,
        smtpTls: true, active: true, lastSyncAt: true, createdAt: true,
        _count: { select: { emails: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(accounts);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = await request.json();
    const { label, host, port, tls, username, password, credType, smtpHost, smtpPort, smtpTls } = body;

    if (!label || !host || !username || !password) {
      return NextResponse.json({ error: "label, host, username y password son requeridos" }, { status: 400 });
    }

    const passwordEnc = encryptPassword(password);
    const account = await prisma.mailAccount.create({
      data: {
        userId: user.id,
        label,
        host,
        port: port ?? 993,
        tls: tls ?? true,
        username,
        passwordEnc,
        credType: credType ?? "PASSWORD_APP",
        smtpHost: smtpHost ?? undefined,
        smtpPort: smtpPort ?? 587,
        smtpTls: smtpTls ?? true,
      },
      select: {
        id: true, label: true, host: true, port: true, tls: true,
        username: true, credType: true, smtpHost: true, smtpPort: true,
        smtpTls: true, active: true, lastSyncAt: true, createdAt: true,
      },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
