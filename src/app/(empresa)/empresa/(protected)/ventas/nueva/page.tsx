import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { asegurarEtapas } from "@/lib/crm/embudo-datos";
import { FUENTES } from "@/lib/crm/embudo";
import { PageHeader } from "@/components/empresa/page-header";
import { FormularioOportunidad, type Candidato } from "../formulario-oportunidad";

export const metadata = { title: "Nueva oportunidad — Pime Suite" };
export const dynamic = "force-dynamic";

/** Client.fuente se guarda con la etiqueta («Redes sociales»); el selector usa el valor («REDES_SOCIALES»). */
const valorFuente = (f: string | null) => (f ? FUENTES.find((x) => x.value === f || x.label.toLowerCase() === f.toLowerCase())?.value ?? null : null);

export default async function NuevaOportunidadPage({ searchParams }: { searchParams: Promise<{ leadId?: string; clientId?: string }> }) {
  const u = await getEmpresaUser();
  const { leadId, clientId } = await searchParams;
  const [etapas, equipo, leads, clientes] = await Promise.all([
    asegurarEtapas(u.id),
    equipoDeLaEmpresa(u.id).catch(() => []),
    prisma.lead.findMany({
      // Los leads en curso, más el que viene en el enlace aunque ya esté convertido o perdido.
      where: { userId: u.id, OR: [{ convertedClientId: null, status: { not: "PERDIDO" } }, ...(leadId ? [{ id: leadId }] : [])] },
      orderBy: { updatedAt: "desc" },
      take: 300,
      select: { id: true, name: true, company: true, email: true, source: true, estimatedValue: true },
    }),
    prisma.client.findMany({
      where: { userId: u.id, archivedAt: null, internal: false },
      orderBy: { updatedAt: "desc" },
      take: 500,
      select: { id: true, name: true, company: true, email: true, fuente: true },
    }),
  ]);

  const candidatos: Candidato[] = [
    ...leads.map((l) => ({ tipo: "lead" as const, id: l.id, nombre: l.name, empresa: l.company, email: l.email, fuente: l.source, valor: l.estimatedValue != null ? Number(l.estimatedValue) : null })),
    ...clientes.map((c) => ({ tipo: "cliente" as const, id: c.id, nombre: c.name, empresa: c.company, email: c.email, fuente: valorFuente(c.fuente), valor: null })),
  ];
  const abiertas = etapas.filter((e) => e.tipo === "abierta");
  const para = leadId ? "lead" : clientId ? "cliente" : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        className="mb-6"
        eyebrow={<Link href="/empresa/ventas" className="mb-2 inline-flex min-h-11 items-center text-sm text-fg-dim hover:text-fg-mute sm:min-h-8">← Ventas</Link>}
        title="Nueva oportunidad"
        description="Un negocio posible con un lead o un cliente. Con el valor y la etapa entra al pronóstico."
      />
      <div className="rounded-xl border border-line bg-panel p-4 sm:p-6">
        <FormularioOportunidad
          etapas={abiertas.map((e) => ({ id: e.id, nombre: e.nombre, probabilidad: e.probabilidad }))}
          equipo={equipo}
          yo={u.miembro.id}
          candidatos={candidatos}
          inicial={{ para, quienId: leadId ?? clientId }}
        />
      </div>
    </div>
  );
}
