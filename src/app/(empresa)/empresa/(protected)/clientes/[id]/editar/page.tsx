import { notFound } from "next/navigation";
import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { reglasDe } from "@/lib/portal/horas";
import { PageHeader } from "@/components/empresa/page-header";
import { ClienteForm } from "@/components/empresa/clientes/formularios";
import { ZonaLinea } from "@/components/empresa/clientes/zona-linea";

export const metadata = { title: "Editar cliente — Pime Suite" };

export default async function EditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getEmpresaUser();
  const c = await prisma.client.findFirst({ where: { id, userId: u.id } });
  if (!c) notFound();
  const r = reglasDe(u.config);
  return (
    <ZonaLinea linea={c.brandLine}>
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader eyebrow={<Link href={`/empresa/clientes/${c.id}`} className="text-sm text-fg-dim hover:text-fg-mute">← {c.company || c.name}</Link>} title="Editar cliente" />
      <div className="bg-panel border border-line rounded-2xl p-4 sm:p-6">
        <ClienteForm tarifas={{ normal: r.tarifaNormal, premium: r.tarifaPremium }} c={{ ...c, hourlyRate: c.hourlyRate == null ? null : String(c.hourlyRate) }} />
      </div>
    </div>
    </ZonaLinea>
  );
}
