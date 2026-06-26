import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { DocumentListTable } from "@/components/empresa/document-list-table";

export const metadata = { title: "Correos — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function CorreosPage() {
  const user = await getEmpresaUser();
  const [documents, unreadCount, accountsCount] = await Promise.all([
    prisma.document.findMany({
      where: { userId: user.id, type: "CORREO" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.inboxEmail.count({ where: { userId: user.id, isRead: false } }),
    prisma.mailAccount.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-white text-2xl font-semibold tracking-tight">Correos</h1>
        <Link href="/empresa/correos/nueva"
          className="px-4 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] text-[#030611] text-sm font-semibold rounded-lg transition-all">
          + Nuevo correo
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06] w-fit">
        {[
          { href: "/empresa/correos/hub", label: "📥 Bandeja de entrada", badge: unreadCount > 0 ? unreadCount : undefined },
          { href: "/empresa/correos", label: "📤 Archivos enviados" },
          { href: "/empresa/correos/cuentas", label: `⚙️ Cuentas${accountsCount > 0 ? ` (${accountsCount})` : ""}` },
        ].map((tab) => (
          <Link key={tab.href} href={tab.href}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all text-white/40 hover:text-white/70 hover:bg-white/[0.04] flex items-center gap-1.5">
            {tab.label}
            {tab.badge != null && (
              <span className="bg-[#1AA7F0]/20 text-[#1AA7F0] text-[10px] rounded-full px-1.5">{tab.badge}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Hub promo if no accounts yet */}
      {accountsCount === 0 && (
        <div className="bg-gradient-to-r from-[#1AA7F0]/[0.07] to-[#6344E8]/[0.07] border border-[#1AA7F0]/15 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-white/80 font-medium text-sm">Conecta tu bandeja de entrada</p>
            <p className="text-white/40 text-xs mt-1">Agrega una cuenta IMAP para leer, clasificar con IA y responder correos directamente desde aquí.</p>
          </div>
          <Link href="/empresa/correos/cuentas/nueva"
            className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all whitespace-nowrap">
            Agregar cuenta
          </Link>
        </div>
      )}

      {/* Archived emails table */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-4">Archivos de correo ({documents.length})</p>
        <DocumentListTable documents={documents} editBasePath="/empresa/correos" />
      </div>
    </div>
  );
}
