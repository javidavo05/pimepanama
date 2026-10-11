import { getPortalUser } from "@/lib/portal/sesion";
import { datosInicio } from "@/lib/portal/datos";
import { Barra, Encabezado, Etiqueta, Tarjeta, Vacio } from "@/components/portal/ui";
import Link from "next/link";

export const metadata = { title: "Proyectos" };
const TIPO: Record<string, string> = { nuevo: "Proyecto", modificacion: "Modificación", soporte: "Soporte" };
const ESTADO: Record<string, [string, "marca" | "ok" | "neutro" | "aviso"]> = { ACTIVE: ["En curso", "marca"], PAUSED: ["En pausa", "aviso"], COMPLETED: ["Terminado", "ok"], CANCELLED: ["Cancelado", "neutro"] };

export default async function ProyectosCliente() {
  const p = await getPortalUser();
  const { proyectos } = await datosInicio(p.clientId);
  return (
    <>
      <Encabezado eyebrow="Tus sistemas" titulo="Proyectos" detalle="Cada proyecto con sus fases, el avance en vivo y en qué fase se paga cada parte." />
      {proyectos.length === 0 ? (
        <Vacio titulo="Todavía no hay proyectos" texto="Cuando Pime cargue un proyecto o una modificación para ti, aparece aquí con sus fases." />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2">
          {proyectos.map((x) => {
            const [label, tono] = ESTADO[x.status] ?? [x.status, "neutro"];
            return (
              <li key={x.id}>
                <Link href={`/cliente/proyectos/${x.id}`} className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  <Tarjeta as="article" className="h-full space-y-4 hover:border-line-loud transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="text-fg-dim text-xs font-semibold uppercase tracking-wider">{TIPO[x.kind] ?? "Proyecto"}</p><p className="text-fg text-lg font-bold tracking-tight break-words">{x.name}</p></div>
                      <Etiqueta tono={tono}>{label}</Etiqueta>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-fg-dim truncate">{x.actual ? `Ahora: ${x.actual.name}` : x.phases.length ? "Fases terminadas" : "Sin fases cargadas"}</span><span className="text-fg font-bold tabular-nums">{Math.round(x.avance)} %</span></div>
                    <Barra valor={x.avance} etiqueta={`Avance de ${x.name}`} />
                  </Tarjeta>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
