import { notFound } from "next/navigation";
import Link from "@/components/empresa/link";
import { PageHeader } from "@/components/empresa/page-header";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { getEmailLogoUrl } from "@/lib/company-logo";
import { PlantillaForm } from "../plantilla-form";

export const metadata = { title: "Editar plantilla — Pime Suite" };

export default async function EditarPlantillaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getEmpresaUser();
  const p = await prisma.plantillaCorreo.findFirst({ where: { id, userId: u.id }, select: { id: true, nombre: true, asunto: true, cuerpo: true } });
  if (!p) notFound();
  return (
    <div className="max-w-6xl mx-auto grid gap-6">
      <PageHeader
        eyebrow={<Link href="/empresa/campanas/plantillas" className="inline-flex items-center min-h-11 text-sm text-fg-dim hover:text-fg">← Plantillas</Link>}
        title={<span className="[overflow-wrap:anywhere]">{p.nombre}</span>}
        description="Los cambios se usan en los próximos correos; lo que ya salió no cambia."
      />
      <PlantillaForm p={p} logoUrl={getEmailLogoUrl()} siteUrl={getSiteUrl()} />
    </div>
  );
}
