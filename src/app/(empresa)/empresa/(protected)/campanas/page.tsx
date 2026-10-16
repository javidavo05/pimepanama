import Link from "@/components/empresa/link";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { fechaCorta } from "@/lib/format-datetime";
import { EstadoCampana, porcentaje as pct } from "./estado-campana";

export const metadata = { title: "Campañas — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function CampanasPage() {
  const u = await getEmpresaUser();
  const [campanas, bajas, plantillas] = await Promise.all([
    prisma.campana.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, select: { id: true, nombre: true, asunto: true, estado: true, enviados: true, abiertos: true, enviadaAt: true, createdAt: true } }),
    prisma.bajaCorreo.count({ where: { userId: u.id } }),
    prisma.plantillaCorreo.count({ where: { userId: u.id } }),
  ]);

  return (
    <div className="max-w-5xl mx-auto grid gap-6">
      <PageHeader
        title="Campañas"
        description={<>Un mismo correo a un grupo de clientes, con baja en un clic y cuántos lo abrieron.{bajas > 0 && <> {bajas} {bajas === 1 ? "persona se dio" : "personas se dieron"} de baja y no reciben campañas.</>}</>}
        actions={<>
          <Link href="/empresa/campanas/plantillas" className={btn.secondary}>Plantillas{plantillas ? ` (${plantillas})` : ""}</Link>
          <Link href="/empresa/campanas/nueva" className={btn.primary}>Nueva campaña</Link>
        </>}
      />
      {campanas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-mid p-8 text-center grid gap-3 justify-items-center">
          <p className="text-fg font-semibold">Todavía no hay campañas</p>
          <p className="text-fg-dim text-sm max-w-md">Elige a quién le escribes con filtros (etiquetas, industria, línea, proyecto activo), revisa la vista previa y envía. Quien se dio de baja y los clientes internos quedan fuera solos.</p>
          <Link href="/empresa/campanas/nueva" className={btn.primary}>Crear la primera campaña</Link>
        </div>
      ) : (
        <ul className="grid gap-2">
          {campanas.map((c) => (
            <li key={c.id}>
              <Link href={`/empresa/campanas/${c.id}`} className="rounded-xl border border-line bg-panel p-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center hover:border-line-mid">
                <div className="min-w-0 grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-fg font-semibold [overflow-wrap:anywhere]">{c.nombre}</span>
                    <EstadoCampana estado={c.estado} />
                  </div>
                  <span className="text-fg-dim text-sm [overflow-wrap:anywhere]">{c.asunto}</span>
                  <span className="text-fg-faint text-xs">{c.enviadaAt ? `Enviada ${fechaCorta(c.enviadaAt)}` : `Creada ${fechaCorta(c.createdAt)}`}</span>
                </div>
                <dl className="grid grid-cols-3 gap-4 text-right md:min-w-64">
                  <div><dt className="text-fg-faint text-xs">Enviados</dt><dd className="text-fg font-semibold tabular-nums">{c.enviados}</dd></div>
                  <div><dt className="text-fg-faint text-xs">Abiertos</dt><dd className="text-fg font-semibold tabular-nums">{c.abiertos}</dd></div>
                  <div><dt className="text-fg-faint text-xs">Apertura</dt><dd className="text-fg font-semibold tabular-nums">{pct(c.abiertos, c.enviados)}</dd></div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
