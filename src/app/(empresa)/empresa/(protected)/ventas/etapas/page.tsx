import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { asegurarEtapas } from "@/lib/crm/embudo-datos";
import { PageHeader } from "@/components/empresa/page-header";
import { EditorEtapas } from "./editor-etapas";

export const metadata = { title: "Etapas del embudo — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function EtapasPage() {
  const u = await getEmpresaUser();
  const [etapas, conteo] = await Promise.all([
    asegurarEtapas(u.id),
    prisma.oportunidad.groupBy({ by: ["etapaId"], where: { userId: u.id }, _count: { _all: true } }),
  ]);
  const cuantas = new Map(conteo.map((c) => [c.etapaId, c._count._all]));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        className="mb-6"
        eyebrow={<Link href="/empresa/ventas" className="mb-2 inline-flex min-h-11 items-center text-sm text-fg-dim hover:text-fg-mute sm:min-h-8">← Ventas</Link>}
        title="Etapas del embudo"
        description="Los pasos por los que pasa un negocio. La probabilidad de cada etapa alimenta el pronóstico ponderado."
      />
      <EditorEtapas etapas={etapas.map((e) => ({ id: e.id, nombre: e.nombre, probabilidad: e.probabilidad, tipo: e.tipo, cuantas: cuantas.get(e.id) ?? 0 }))} />
    </div>
  );
}
