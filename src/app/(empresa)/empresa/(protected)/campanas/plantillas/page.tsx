import Link from "@/components/empresa/link";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { fechaCorta } from "@/lib/format-datetime";
import { borrarPlantillaAction, duplicarPlantillaAction } from "../../acciones-campanas";
import { ConfirmarBoton } from "../confirmar-boton";

export const metadata = { title: "Plantillas de correo — Pime Suite" };
export const dynamic = "force-dynamic";

const accionChica = "inline-flex items-center justify-center min-h-11 px-3 rounded-lg text-sm font-semibold text-fg-dim hover:text-fg whitespace-nowrap";

export default async function PlantillasPage({ searchParams }: { searchParams: Promise<{ guardada?: string }> }) {
  const u = await getEmpresaUser();
  const { guardada } = await searchParams;
  const plantillas = await prisma.plantillaCorreo.findMany({ where: { userId: u.id }, orderBy: { updatedAt: "desc" }, select: { id: true, nombre: true, asunto: true, updatedAt: true } });

  return (
    <div className="max-w-5xl mx-auto grid gap-6">
      <PageHeader
        eyebrow={<Link href="/empresa/campanas" className="inline-flex items-center min-h-11 text-sm text-fg-dim hover:text-fg">← Campañas</Link>}
        title="Plantillas de correo"
        description="Correos que se repiten, con el nombre y la empresa de cada persona. Se usan en la ficha del cliente y en las campañas."
        actions={<Link href="/empresa/campanas/plantillas/nueva" className={btn.primary}>Nueva plantilla</Link>}
      />
      {guardada && <p className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok" role="status">Plantilla guardada.</p>}
      {plantillas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-mid p-8 text-center grid gap-3 justify-items-center">
          <p className="text-fg font-semibold">Todavía no hay plantillas</p>
          <p className="text-fg-dim text-sm max-w-md">Guarda aquí los correos que escribes seguido: seguimiento de una propuesta, bienvenida, recordatorio. Al usarla se llenan solos el nombre y la empresa.</p>
          <Link href="/empresa/campanas/plantillas/nueva" className={btn.primary}>Crear la primera plantilla</Link>
        </div>
      ) : (
        <ul className="grid gap-2">
          {plantillas.map((p) => (
            <li key={p.id} className="rounded-xl border border-line bg-panel p-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <Link href={`/empresa/campanas/plantillas/${p.id}`} className="min-w-0 grid gap-1 hover:opacity-90">
                <span className="text-fg font-semibold [overflow-wrap:anywhere]">{p.nombre}</span>
                <span className="text-fg-dim text-sm [overflow-wrap:anywhere]">{p.asunto}</span>
                <span className="text-fg-faint text-xs">Editada {fechaCorta(p.updatedAt)}</span>
              </Link>
              <div className="flex flex-wrap items-center gap-1 -mx-3 md:mx-0">
                <Link href={`/empresa/campanas/nueva?plantilla=${p.id}`} className={accionChica}>Usar en campaña</Link>
                <form action={duplicarPlantillaAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className={accionChica}>Duplicar</button>
                </form>
                <ConfirmarBoton accion={borrarPlantillaAction} id={p.id} etiqueta="Borrar" confirmar="Sí, borrar" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
