import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { PegarCredenciales } from "./pegar-credenciales";

export const metadata = { title: "Pegar credenciales — Pime Suite" };
export const dynamic = "force-dynamic";

/** ?proyecto=<id> deja elegido ese proyecto como destino (desde la ficha o desde Sistemas). */
export default async function CredencialesPage({ searchParams }: { searchParams: Promise<{ proyecto?: string }> }) {
  const [user, { proyecto }] = await Promise.all([getEmpresaUser(), searchParams]);
  const llaves = await prisma.deviceToken.count({ where: { userId: user.miembro.id, revokedAt: null, name: { startsWith: "Claude Code" } } });

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Link href="/empresa/platforms" className="text-fg-faint hover:text-fg-mute text-xs">
        ← Accesos y cuentas
      </Link>
      <h1 className="text-fg text-2xl font-semibold tracking-tight mt-2">Pegar credenciales</h1>
      <p className="text-fg-dim text-sm mt-1 leading-relaxed">
        Pega todo lo que te pasaron —un .env, una lista o el chat— y Pime toma lo que sirve: guarda las cuentas de GitHub,
        Vercel y Supabase, liga el sistema a su cliente y revisa que sus fases estén en GitHub.
      </p>
      <PegarCredenciales proyectoInicial={proyecto ?? null} llavesClaude={llaves} />
    </div>
  );
}
