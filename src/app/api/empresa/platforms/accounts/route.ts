import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { normEmail } from "@/lib/platforms-seed";

export const runtime = "nodejs";

const PROVIDERS = new Set(["supabase", "vercel"]);
const PLANS = new Set(["FREE", "PRO"]);

/** Marca una cuenta (correo + proveedor) como gratis o Pro. */
export async function PUT(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const data = await request.json();
    const provider = String(data.provider ?? "");
    const plan = String(data.plan ?? "");
    const email = normEmail(data.email == null ? null : String(data.email));
    if (!PROVIDERS.has(provider) || !PLANS.has(plan) || !email) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const account = await prisma.platformAccount.upsert({
      where: { userId_provider_email: { userId: user.id, provider, email } },
      create: { userId: user.id, provider, email, plan },
      update: { plan },
    });
    return NextResponse.json({ provider: account.provider, email: account.email, plan: account.plan });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
