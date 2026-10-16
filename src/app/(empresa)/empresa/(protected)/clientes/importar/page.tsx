import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/empresa/page-header";
import { ImportarForm } from "./importar-form";

export const metadata = { title: "Importar clientes — Pime Suite" };

export default async function ImportarClientesPage() {
  const u = await getEmpresaUser();
  // Los correos de hoy, para marcar en la vista previa los que ya tienen cliente (la acción vuelve a revisar al crear).
  const conCorreo = await prisma.client.findMany({ where: { userId: u.id, email: { not: null } }, select: { email: true } });
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        eyebrow={<Link href="/empresa/clientes" className="inline-flex min-h-11 items-center text-sm text-fg-dim hover:text-fg sm:min-h-0 sm:mb-2">← Clientes</Link>}
        title="Importar clientes"
        description="Sube una hoja CSV (desde Excel, Google Sheets o Numbers). Revisas las columnas y una vista previa antes de crear nada."
      />
      <ImportarForm correos={conCorreo.map((c) => (c.email ?? "").toLowerCase()).filter(Boolean)} />
    </div>
  );
}
