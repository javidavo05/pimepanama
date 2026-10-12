import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { normEmail } from "@/lib/platforms-seed";

export const runtime = "nodejs";

const PROVIDERS = new Set(["supabase", "vercel"]);
const PLANS = new Set(["FREE", "PRO"]);

/** Marca a mano una cuenta (correo + proveedor) como gratis o Pro. */
export const PUT = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const data = await req.json().catch(() => ({}));
  const provider = String(data.provider ?? "");
  const plan = String(data.plan ?? "");
  const email = normEmail(data.email == null ? null : String(data.email));
  if (!PROVIDERS.has(provider) || !PLANS.has(plan) || !email) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const account = await prisma.platformAccount.upsert({
    where: { userId_provider_email: { userId: user.id, provider, email } },
    create: { userId: user.id, provider, email, plan, planSource: "manual" },
    update: { plan, planSource: "manual" },
  });
  return NextResponse.json({ id: account.id, provider: account.provider, email: account.email, plan: account.plan });
});
