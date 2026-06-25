import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    if (!user.configId) return NextResponse.json(null);
    const config = await prisma.companyConfig.findUnique({
      where: { id: user.configId },
    });
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = await request.json();

    let config;
    if (user.configId) {
      config = await prisma.companyConfig.update({
        where: { id: user.configId },
        data: body,
      });
    } else {
      config = await prisma.companyConfig.create({ data: body });
      await prisma.empresaUser.update({
        where: { id: user.id },
        data: { configId: config.id },
      });
    }

    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
