import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { AccountActions } from "./account-actions";
import { formatDateTimeEsPa } from "@/lib/format-datetime";
import { PageHeader, btn } from "@/components/empresa/page-header";

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
      <PageHeader
        title="Cuentas de correo"
        description="Gestiona las cuentas IMAP conectadas"
        actions={
          <Link href="/empresa/correos/cuentas/nueva" className={btn.primary}>
            + Agregar cuenta
          </Link>
        }
      />

      {accounts.length === 0 ? (
        <div className="bg-panel border border-line rounded-xl p-10 text-center">
          <div className="w-12 h-12 bg-fill rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📥</span>
          </div>
          <p className="text-fg-faint text-sm mb-1">Sin cuentas configuradas</p>
          <p className="text-fg-faint text-xs mb-4">Conecta una cuenta IMAP para empezar</p>
          <Link href="/empresa/correos/cuentas/nueva"
            className="inline-block px-4 py-2 bg-brand/10 border border-brand/20 text-brand-fg text-sm rounded-lg hover:bg-brand/15 transition-all">
            Agregar primera cuenta
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-panel border border-line rounded-xl p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full ${acc.active ? "bg-ok" : "bg-fill-3"}`} />
                <div className="min-w-0">
                  <p className="text-fg font-medium text-sm">{acc.label}</p>
                  <p className="text-fg-dim text-xs break-all">{acc.username} · {acc.host}:{acc.port}</p>
                  {acc.lastSyncAt && (
                    <p className="text-fg-faint text-xs mt-0.5">
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
