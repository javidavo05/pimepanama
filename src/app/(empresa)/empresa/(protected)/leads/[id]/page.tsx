import Link from "@/components/empresa/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeLead } from "@/lib/serializers";
import { LeadDetailClient } from "./lead-detail-client";
import { Responsable } from "@/components/empresa/equipo/responsable";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { OportunidadesCliente } from "@/components/empresa/crm/oportunidades-cliente";
import { historiaDelLead, deInteraccion } from "@/lib/crm/historia";
import { Historia } from "@/components/empresa/crm-ficha/historia";
import { RegistrarInteraccion } from "@/components/empresa/crm-ficha/registrar";
import { card, h2 } from "@/components/empresa/crm-ficha/comun";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const lead = await prisma.lead.findFirst({
    where: { id, userId: user.id },
    include: {
      convertedClient: { select: { id: true, name: true } },
      documents: {
        select: { id: true, type: true, number: true, status: true, total: true, issueDate: true, title: true },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!lead) notFound();
  const [equipo, historia, fijadas] = await Promise.all([
    equipoDeLaEmpresa(user.id).catch(() => []),
    historiaDelLead(user.id, lead.id).catch((e) => { console.error("[lead] comunicación", e); return null; }),
    prisma.interaccion.findMany({
      where: { userId: user.id, leadId: lead.id, fijada: true }, orderBy: { ocurrioAt: "desc" }, take: 10,
      select: { id: true, tipo: true, direccion: true, resumen: true, resultado: true, duracionMin: true, proximoPaso: true, fijada: true, ocurrioAt: true, contacto: { select: { nombre: true } }, autor: { select: { fullName: true, email: true } } },
    }).catch(() => []),
  ]);

  const serialized = {
    ...serializeLead(lead),
    convertedClient: lead.convertedClient,
    documents: lead.documents.map((d) => ({
      ...d,
      total: d.total != null ? Number(d.total) : null,
      issueDate: d.issueDate.toISOString(),
    })),
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4 sm:mb-6 text-sm min-w-0">
        <Link
          href="/empresa/leads"
          className="inline-flex items-center min-h-11 sm:min-h-8 shrink-0 text-fg-dim hover:text-fg-mute transition-colors"
        >
          Leads
        </Link>
        <span className="text-fg-faint">/</span>
        <span className="text-fg-dim truncate min-w-0 max-w-xs">{lead.name}</span>
      </div>

      {equipo.length > 1 && <div className="mb-4"><Responsable tipo="lead" id={lead.id} actual={lead.responsableId} equipo={equipo} /></div>}
      <LeadDetailClient lead={serialized} />
      <section className={`${card} mt-6 space-y-6`} aria-labelledby="comunicacion-titulo">
        <div>
          <h2 id="comunicacion-titulo" className={h2}>Comunicación</h2>
          <p className="mt-1 text-sm text-fg-dim">Correos con {lead.email ?? "su dirección"}, llamadas, WhatsApp, citas y cotizaciones, en orden. Lo que registres aquí pasa a su ficha de cliente cuando se gane.</p>
        </div>
        <RegistrarInteraccion leadId={lead.id} contactos={[]} />
        <Historia leadId={lead.id} inicial={historia} fijadas={fijadas.map(deInteraccion)} />
      </section>
      <div className="mt-6">
        <OportunidadesCliente leadId={lead.id} />
      </div>
    </div>
  );
}
