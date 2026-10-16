import { notFound } from "next/navigation";
import Link from "@/components/empresa/link";
import { PageHeader } from "@/components/empresa/page-header";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { getSiteUrl } from "@/lib/site-url";
import { getEmailLogoUrl } from "@/lib/company-logo";
import { datosDelSegmento } from "@/lib/crm/campanas-servidor";
import { normalizarFiltro } from "@/lib/crm/campanas";
import { CampanaForm } from "./campana-form";

export const metadata = { title: "Nueva campaña — Pime Suite" };
export const dynamic = "force-dynamic";

/** `?id=` edita un borrador; `?plantilla=` empieza con esa plantilla puesta. */
export default async function NuevaCampanaPage({ searchParams }: { searchParams: Promise<{ id?: string; plantilla?: string }> }) {
  const u = await getEmpresaUser();
  const sp = await searchParams;
  const [segmento, plantillas, equipo, campana] = await Promise.all([
    datosDelSegmento(u.id),
    prisma.plantillaCorreo.findMany({ where: { userId: u.id }, orderBy: { updatedAt: "desc" }, select: { id: true, nombre: true, asunto: true, cuerpo: true } }),
    equipoDeLaEmpresa(u.id),
    sp.id ? prisma.campana.findFirst({ where: { id: sp.id, userId: u.id }, select: { id: true, nombre: true, asunto: true, cuerpo: true, filtro: true, estado: true } }) : Promise.resolve(null),
  ]);
  if (sp.id && (!campana || campana.estado !== "borrador")) notFound();
  const desde = plantillas.find((p) => p.id === sp.plantilla);

  return (
    <div className="max-w-6xl mx-auto grid gap-6">
      <PageHeader
        eyebrow={<Link href="/empresa/campanas" className="inline-flex items-center min-h-11 text-sm text-fg-dim hover:text-fg">← Campañas</Link>}
        title={campana ? "Editar campaña" : "Nueva campaña"}
        description="Elige a quién le llega, escribe el correo y revisa la vista previa. Se guarda como borrador hasta que confirmes el envío."
      />
      <CampanaForm
        campana={campana ? { ...campana, filtro: normalizarFiltro(campana.filtro) } : undefined}
        inicial={desde ? { asunto: desde.asunto, cuerpo: desde.cuerpo, plantillaId: desde.id } : undefined}
        clientes={segmento.clientes}
        bajas={segmento.bajas}
        plantillas={plantillas}
        equipo={equipo}
        miNombre={u.miembro.fullName || u.miembro.email}
        logoUrl={getEmailLogoUrl()}
        siteUrl={getSiteUrl()}
      />
    </div>
  );
}
