import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { normEmail, normSlot } from "@/lib/platforms-seed";

export const runtime = "nodejs";

const PATCH_FIELDS = [
  "name", "accessUrl", "supabaseEmail", "supabaseSlot",
  "vercelEmail", "vercelSlot", "linkUrl", "githubEmail",
  "brevoEmail", "notes", "sortOrder",
] as const;

const EMAIL_FIELDS = new Set(["supabaseEmail", "vercelEmail", "githubEmail", "brevoEmail"]);
const SLOT_FIELDS = new Set(["supabaseSlot", "vercelSlot"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.platform.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await request.json();
    const update: Record<string, unknown> = {};
    for (const key of PATCH_FIELDS) {
      if (!(key in data)) continue;
      let value = data[key];
      if (EMAIL_FIELDS.has(key)) {
        value = normEmail(value == null ? null : String(value));
      } else if (SLOT_FIELDS.has(key)) {
        value = normSlot(value);
      }
      update[key] = value;
    }

    const platform = await prisma.platform.update({ where: { id }, data: update });
    return NextResponse.json(platform);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.platform.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.platform.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
