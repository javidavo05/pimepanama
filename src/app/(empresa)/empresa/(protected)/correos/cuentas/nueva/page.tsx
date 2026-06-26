import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { MailAccountForm } from "@/components/empresa/mail/mail-account-form";

export const metadata = { title: "Nueva cuenta de correo — Pime Suite" };

export default async function NuevaCuentaPage() {
  await getEmpresaUser();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/empresa/correos/cuentas" className="text-white/30 text-sm hover:text-white/60 transition-colors">
          ← Cuentas
        </Link>
        <h1 className="text-white text-2xl font-semibold tracking-tight mt-2">Agregar cuenta de correo</h1>
        <p className="text-white/40 text-sm mt-1">Conecta una cuenta IMAP para recibir y gestionar correos.</p>
      </div>
      <MailAccountForm mode="create" />
    </div>
  );
}
