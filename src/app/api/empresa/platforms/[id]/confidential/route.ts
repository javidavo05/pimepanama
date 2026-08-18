import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { verifyMasterPassword } from "@/lib/platform-vault-master";
import {
  decryptPlatformVault,
  encryptPlatformVault,
  hasPlatformVault,
} from "@/lib/platform-vault-crypto";

export const runtime = "nodejs";

async function loadPlatform(id: string, userId: string) {
  return prisma.platform.findFirst({ where: { id, userId } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const platform = await loadPlatform(id, user.id);
    if (!platform) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const password = String(body.password ?? "");
    if (!verifyMasterPassword(password)) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 403 });
    }

    if (!hasPlatformVault(platform.confidentialVault)) {
      return NextResponse.json({ content: "" });
    }

    try {
      const content = decryptPlatformVault(platform.confidentialVault!);
      return NextResponse.json({ content });
    } catch {
      return NextResponse.json({ error: "No se pudo descifrar" }, { status: 500 });
    }
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const platform = await loadPlatform(id, user.id);
    if (!platform) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const password = String(body.password ?? "");
    const content = String(body.content ?? "");

    if (!verifyMasterPassword(password)) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 403 });
    }

    if (!content.trim()) {
      return NextResponse.json({ error: "Contenido vacío" }, { status: 400 });
    }

    const confidentialVault = encryptPlatformVault(content.trim());
    const updated = await prisma.platform.update({
      where: { id },
      data: { confidentialVault },
    });

    return NextResponse.json({
      id: updated.id,
      hasConfidential: true,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const platform = await loadPlatform(id, user.id);
    if (!platform) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const password = String(body.password ?? "");
    if (!verifyMasterPassword(password)) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 403 });
    }

    await prisma.platform.update({
      where: { id },
      data: { confidentialVault: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
