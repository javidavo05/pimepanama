import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { MailAccountForm } from "@/components/empresa/mail/mail-account-form";
import { ensureMailSignaturesSeeded } from "@/lib/mail/signature-bootstrap";
import { defaultSignatureTitleForLabel } from "@/lib/mail/signature";

export const metadata = { title: "Editar cuenta — Pime Suite" };

export default async function EditCuentaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getEmpresaUser();
  await ensureMailSignaturesSeeded(user.id);
  const { id } = await params;

  const [account, company] = await Promise.all([
    prisma.mailAccount.findFirst({ where: { id, userId: user.id } }),
    user.configId
      ? prisma.companyConfig.findFirst({
          where: { id: user.configId },
          select: { name: true, email: true, phone: true, website: true, logoUrl: true },
        })
      : Promise.resolve(null),
  ]);
  if (!account) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/empresa/correos/cuentas" className="text-white/55 text-sm hover:text-white/60 transition-colors">
          ← Cuentas
        </Link>
        <h1 className="text-white text-2xl font-semibold tracking-tight mt-2">Editar cuenta</h1>
        <p className="text-white/60 text-sm mt-1">{account.label} — {account.username}</p>
      </div>
      <MailAccountForm
        mode="edit"
        accountId={account.id}
        company={company}
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
          fromName: account.fromName ?? "Javier Vallejo",
          signatureName: account.signatureName ?? "Javier Vallejo",
          signatureTitle: account.signatureTitle ?? defaultSignatureTitleForLabel(account.label),
          signatureEnabled: account.signatureEnabled,
        }}
      />
    </div>
  );
}
