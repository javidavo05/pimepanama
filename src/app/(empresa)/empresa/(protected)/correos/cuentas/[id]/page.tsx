import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { MailAccountForm } from "@/components/empresa/mail/mail-account-form";

export const metadata = { title: "Editar cuenta — Pime Suite" };

export default async function EditCuentaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getEmpresaUser();
  const { id } = await params;
  const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id } });
  if (!account) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/empresa/correos/cuentas" className="text-white/30 text-sm hover:text-white/60 transition-colors">
          ← Cuentas
        </Link>
        <h1 className="text-white text-2xl font-semibold tracking-tight mt-2">Editar cuenta</h1>
        <p className="text-white/40 text-sm mt-1">{account.label} — {account.username}</p>
      </div>
      <MailAccountForm
        mode="edit"
        accountId={account.id}
        initial={{
          label: account.label,
          host: account.host,
          port: String(account.port),
          tls: account.tls,
          username: account.username,
          credType: account.credType,
          smtpHost: account.smtpHost ?? undefined,
          smtpPort: String(account.smtpPort ?? 587),
          smtpTls: account.smtpTls,
        }}
      />
    </div>
  );
}
