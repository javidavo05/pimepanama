import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { reglasDe } from "@/lib/portal/horas";
import { PageHeader } from "@/components/empresa/page-header";
import { ClienteForm } from "@/components/empresa/clientes/formularios";

export const metadata = { title: "Nuevo cliente — Pime Suite" };

export default async function NuevoCliente() {
  const u = await getEmpresaUser();
  const r = reglasDe(u.config);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader eyebrow={<Link href="/empresa/clientes" className="text-sm text-fg-dim hover:text-fg-mute">← Clientes</Link>} title="Nuevo cliente" description="Con sus datos y su línea. Si tiene correo, le llega la invitación a su cuenta en Pime." />
      <div className="bg-panel border border-line rounded-2xl p-4 sm:p-6"><ClienteForm tarifas={{ normal: r.tarifaNormal, premium: r.tarifaPremium }} /></div>
    </div>
  );
}
