import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { AccountActions } from "./account-actions";
import { formatDateTimeEsPa } from "@/lib/format-datetime";

export const metadata = { title: "Cuentas de correo — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function CuentasPage() {
  const user = await getEmpresaUser();
  const accounts = await prisma.mailAccount.findMany({
    where: { userId: user.id },
    include: { _count: { select: { emails: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Cuentas de correo</h1>
          <p className="text-white/60 text-sm mt-1">Gestiona las cuentas IMAP conectadas</p>
        </div>
        <Link href="/empresa/correos/cuentas/nueva"
          className="px-4 py-2.5 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all">
          + Agregar cuenta
        </Link>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-10 text-center">
          <div className="w-12 h-12 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📥</span>
          </div>
          <p className="text-white/50 text-sm mb-1">Sin cuentas configuradas</p>
          <p className="text-white/50 text-xs mb-4">Conecta una cuenta IMAP para empezar</p>
          <Link href="/empresa/correos/cuentas/nueva"
            className="inline-block px-4 py-2 bg-[#1AA7F0]/10 border border-[#1AA7F0]/20 text-[#1AA7F0] text-sm rounded-lg hover:bg-[#1AA7F0]/15 transition-all">
            Agregar primera cuenta
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${acc.active ? "bg-green-400" : "bg-white/20"}`} />
                <div>
                  <p className="text-white font-medium text-sm">{acc.label}</p>
                  <p className="text-white/60 text-xs">{acc.username} · {acc.host}:{acc.port}</p>
                  {acc.lastSyncAt && (
                    <p className="text-white/50 text-xs mt-0.5">
                      Último sync: {formatDateTimeEsPa(acc.lastSyncAt)} · {acc._count.emails} correos
                    </p>
                  )}
                </div>
              </div>
              <AccountActions accountId={acc.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
