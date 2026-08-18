import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { ensurePlatformsSeeded } from "@/lib/platforms-bootstrap";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    await ensurePlatformsSeeded(user.id);
    const platforms = await prisma.platform.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(platforms);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const data = await request.json();
    const maxOrder = await prisma.platform.aggregate({
      where: { userId: user.id },
      _max: { sortOrder: true },
    });
    const platform = await prisma.platform.create({
      data: {
        userId: user.id,
        name: String(data.name ?? "Nueva plataforma"),
        accessUrl: data.accessUrl ?? null,
        supabaseEmail: data.supabaseEmail ?? null,
        supabaseSlot: data.supabaseSlot ?? null,
        vercelEmail: data.vercelEmail ?? null,
        vercelSlot: data.vercelSlot ?? null,
        linkUrl: data.linkUrl ?? null,
        githubEmail: data.githubEmail ?? null,
        brevoEmail: data.brevoEmail ?? null,
        notes: data.notes ?? null,
        sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json(platform, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
