import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { asegurarEtapas } from "@/lib/crm/embudo-datos";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { TableroVentas, type OpTablero } from "./tablero";

export const metadata = { title: "Ventas — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const u = await getEmpresaUser();
  const [etapas, ops, equipo] = await Promise.all([
    asegurarEtapas(u.id),
    prisma.oportunidad.findMany({
      where: { userId: u.id },
      orderBy: { updatedAt: "desc" },
      take: 500,
      select: {
        id: true, titulo: true, valor: true, probabilidad: true, cierreEsperado: true, estado: true, etapaId: true,
        responsableId: true, fuente: true, cerradaAt: true, motivoPerdida: true,
        client: { select: { name: true, company: true } },
        lead: { select: { name: true, company: true } },
      },
    }),
    equipoDeLaEmpresa(u.id).catch(() => []),
  ]);

  const datos: OpTablero[] = ops.map((o) => ({
    id: o.id,
    titulo: o.titulo,
    valor: Number(o.valor),
    probabilidad: o.probabilidad,
    cierreEsperado: o.cierreEsperado?.toISOString() ?? null,
    estado: o.estado,
    etapaId: o.etapaId,
    responsableId: o.responsableId,
    fuente: o.fuente,
    cerradaAt: o.cerradaAt?.toISOString() ?? null,
    motivoPerdida: o.motivoPerdida,
    quien: o.client ? o.client.company || o.client.name : o.lead ? o.lead.company || o.lead.name : "Sin cliente",
    esLead: !o.client && !!o.lead,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        className="mb-6"
        title="Ventas"
        description="Los negocios en curso, en qué etapa va cada uno y cuánto se espera cerrar."
        actions={
          <>
            <Link href="/empresa/ventas/etapas" className={btn.secondary}>Editar etapas</Link>
            <Link href="/empresa/ventas/nueva" className={btn.primary}>Nueva oportunidad</Link>
          </>
        }
      />
      <TableroVentas
        etapas={etapas.map((e) => ({ id: e.id, nombre: e.nombre, probabilidad: e.probabilidad, tipo: e.tipo, orden: e.orden }))}
        ops={datos}
        equipo={equipo}
        yo={u.miembro.id}
      />
    </div>
  );
}
