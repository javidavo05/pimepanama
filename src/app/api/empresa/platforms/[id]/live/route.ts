import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { accountKey } from "@/lib/platform-slots";
import { listaDeCuenta, ultimoCommit } from "@/lib/platforms/cuentas";

export const runtime = "nodejs";

/**
 * Lo vivo de una plataforma al abrirla: último commit del repo, último deploy de Vercel y estado del
 * proyecto de Supabase. Todo desde la caché de 30 min; ?refresh=1 vuelve a consultar.
 */
export const GET = withEmpresaIdRoute(async (req, { params }) => {
  const { id } = await params;
  const user = await requireEmpresaUser(req);
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  const p = await prisma.platform.findFirst({ where: { id, userId: user.id } });
  if (!p) return NextResponse.json({ error: "Esa plataforma ya no existe." }, { status: 404 });

  const cuentas = await prisma.platformAccount.findMany({
    where: { userId: user.id, tokenEnc: { not: null }, OR: [{ provider: "vercel", email: p.vercelEmail ?? "" }, { provider: "supabase", email: p.supabaseEmail ?? "" }] },
    select: { id: true, provider: true, email: true },
  });
  const cuenta = (prov: "vercel" | "supabase", email: string | null) => cuentas.find((c) => accountKey(c.provider as "vercel", c.email) === accountKey(prov, email));
  const vAcc = p.vercelProjectId ? cuenta("vercel", p.vercelEmail) : undefined;
  const sAcc = p.supabaseProjectRef ? cuenta("supabase", p.supabaseEmail) : undefined;

  const [commit, vercel, supabase] = await Promise.all([
    p.githubAccountId && p.githubRepo ? ultimoCommit(user.id, p.githubAccountId, p.githubRepo, force) : null,
    vAcc ? listaDeCuenta(user.id, "vercel", vAcc.id, force) : null,
    sAcc ? listaDeCuenta(user.id, "supabase", sAcc.id, force) : null,
  ]);

  return NextResponse.json({
    github: commit ? { commit: commit.data ?? null, error: commit.error, fetchedAt: commit.fetchedAt } : null,
    vercel: vercel
      ? { project: vercel.data?.find((x) => x.id === p.vercelProjectId) ?? null, error: vercel.error, fetchedAt: vercel.fetchedAt }
      : null,
    supabase: supabase
      ? { project: supabase.data?.find((x) => x.ref === p.supabaseProjectRef) ?? null, error: supabase.error, fetchedAt: supabase.fetchedAt }
      : null,
  });
});
