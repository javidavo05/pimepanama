import Link from "@/components/empresa/link";
import { PageHeader } from "@/components/empresa/page-header";
import { getSiteUrl } from "@/lib/site-url";
import { getEmailLogoUrl } from "@/lib/company-logo";
import { PlantillaForm } from "../plantilla-form";

export const metadata = { title: "Nueva plantilla — Pime Suite" };

export default function NuevaPlantillaPage() {
  return (
    <div className="max-w-6xl mx-auto grid gap-6">
      <PageHeader
        eyebrow={<Link href="/empresa/campanas/plantillas" className="inline-flex items-center min-h-11 text-sm text-fg-dim hover:text-fg">← Plantillas</Link>}
        title="Nueva plantilla"
        description="Un correo que se repite, listo para usar desde la ficha del cliente o en una campaña."
      />
      <PlantillaForm logoUrl={getEmailLogoUrl()} siteUrl={getSiteUrl()} />
    </div>
  );
}
