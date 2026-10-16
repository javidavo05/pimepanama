import { getPortalUser } from "@/lib/portal/sesion";
import { prisma } from "@/lib/prisma";
import { archivosDelCliente, proyectosDelCliente } from "@/lib/portal/datos";
import { subidoPorTexto, tamanoLegible } from "@/lib/portal/documentos";
import { Encabezado, Tarjeta, TituloSeccion, Vacio, btnSecundario, fechaCorta } from "@/components/portal/ui";
import { IconDescargar } from "@/components/portal/iconos";
import { SubirArchivo } from "@/components/portal/subir-archivo";
import { errorBox } from "@/components/auth/auth-shell";

export const metadata = { title: "Archivos" };

export default async function ArchivosCliente({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const p = await getPortalUser();
  const [{ aviso }, archivos, proyectos] = await Promise.all([
    searchParams,
    archivosDelCliente(p.clientId),
    prisma.project.findMany({ where: proyectosDelCliente(p.clientId), select: { id: true, name: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  return (
    <>
      <Encabezado eyebrow="Documentos" titulo="Archivos" detalle="Lo que Pime comparte contigo y lo que tú nos mandas: logos, textos, fotos, accesos en PDF. Todo queda guardado aquí." />
      {aviso === "archivo-no-disponible" && <p className={errorBox} role="alert">Ese archivo ya no está disponible. Si lo necesitas, pídeselo a Pime con un ticket.</p>}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <Tarjeta className="lg:col-span-8" i={1}>
          <TituloSeccion>Tus archivos</TituloSeccion>
          {archivos.length === 0 ? (
            <Vacio titulo="Todavía no hay archivos" texto="Sube aquí lo que necesitemos para tu proyecto (logo, fotos, textos) o encuentra lo que Pime te comparta. Cada archivo queda con su fecha y quién lo subió." />
          ) : (
            <ul className="divide-y divide-line">
              {archivos.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-4 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-fg font-semibold [overflow-wrap:anywhere]">{a.nombre}</p>
                    <p className="text-fg-dim text-sm">{[tamanoLegible(a.tamano), fechaCorta(a.createdAt), `subió ${subidoPorTexto(a.subidoPor)}`, a.project?.name].filter(Boolean).join(" · ")}</p>
                  </div>
                  <a href={`/api/cliente/archivos/${a.id}`} className={`${btnSecundario} min-h-11 px-4 shrink-0`} aria-label={`Descargar ${a.nombre}`}><IconDescargar width={18} height={18} /><span className="hidden sm:inline">Descargar</span></a>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
        <Tarjeta className="lg:col-span-4" i={2}>
          <TituloSeccion>Mandarle un archivo a Pime</TituloSeccion>
          <SubirArchivo proyectos={proyectos} />
        </Tarjeta>
      </div>
    </>
  );
}
