import Link from "next/link";
import { getPortalUser } from "@/lib/portal/sesion";
import { datosInicio } from "@/lib/portal/datos";
import { ProyectoDetalle } from "@/components/portal/proyecto-detalle";
import { Anillo, Cifra, Encabezado, Etiqueta, Swap, Tarjeta, TituloSeccion, Vacio, btnPrincipal, type Tono } from "@/components/portal/ui";
import { IconFlecha, IconMas } from "@/components/portal/iconos";

export const metadata = { title: "Proyectos" };
const TIPO: Record<string, string> = { nuevo: "Proyecto", modificacion: "Modificación", soporte: "Soporte" };
const ESTADO: Record<string, [string, Tono]> = { ACTIVE: ["En curso", "marca"], PAUSED: ["En pausa", "aviso"], COMPLETED: ["Terminado", "ok"], CANCELLED: ["Cancelado", "neutro"] };

type Proyecto = Awaited<ReturnType<typeof datosInicio>>["proyectos"][number];

/** Tarjeta para elegir un proyecto: avance, fase actual y una tira de fases con código de color. */
function TarjetaProyecto({ x, i }: { x: Proyecto; i: number }) {
  const [label, tono] = ESTADO[x.status] ?? [x.status, "neutro" as Tono];
  const hechas = x.phases.filter((f) => f.status === "hecha").length;
  return (
    <li>
      <Link href={`/cliente/proyectos/${x.id}`} className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <Tarjeta as="article" tocable i={i} className="h-full flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1"><p className="p-eyebrow">{TIPO[x.kind] ?? "Proyecto"}</p><p className="text-fg text-xl font-extrabold tracking-tight break-words">{x.name}</p></div>
            <Etiqueta tono={tono}>{label}</Etiqueta>
          </div>
          <div className="flex items-center gap-4">
            <Anillo valor={x.avance} tam={72} grosor={8} etiqueta={`Avance de ${x.name}`}>
              <Cifra texto={`${Math.round(x.avance)}`} className="text-fg text-lg font-extrabold" demora={200} /><span className="block text-fg-dim text-xs font-semibold">%</span>
            </Anillo>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-fg-dim text-sm">{x.actual ? "Fase actual" : x.phases.length ? "Estado" : "Fases"}</p>
              <p className="text-fg font-bold break-words">{x.actual ? x.actual.name : x.phases.length ? "Todas las fases terminadas" : "Pime las carga al aprobar la propuesta"}</p>
            </div>
          </div>
          {x.phases.length > 0 && (
            <div className="space-y-2">
              <ol className="flex gap-1" aria-label={`${hechas} de ${x.phases.length} fases terminadas`}>
                {x.phases.map((f, k) => {
                  const t: Tono = f.status === "hecha" ? "ok" : f.id === x.actual?.id ? "marca" : f.status === "en_revision" ? "aviso" : "neutro";
                  return <li key={f.id} data-tono={t} title={f.name} className="h-2 flex-1 rounded-full bg-[var(--t)] opacity-90 p-in" style={{ "--i": k } as React.CSSProperties} />;
                })}
              </ol>
              <p className="text-fg-faint text-xs">{hechas} de {x.phases.length} fases terminadas</p>
            </div>
          )}
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-fg">Ver el proyecto<IconFlecha width={16} height={16} className="transition-transform duration-300 group-hover:translate-x-1" /></span>
        </Tarjeta>
      </Link>
    </li>
  );
}

export default async function ProyectosCliente() {
  const p = await getPortalUser();
  const { proyectos, activos } = await datosInicio(p.clientId);
  const otros = proyectos.filter((x) => !activos.some((a) => a.id === x.id));

  // Un solo proyecto activo: se muestra completo de una vez, sin pasar por una lista de una tarjeta.
  if (activos.length === 1) {
    const detalle = await ProyectoDetalle({ clientId: p.clientId, id: activos[0].id, eyebrow: "Tu proyecto en curso" });
    return (
      <>
        {detalle}
        {otros.length > 0 && (
          <section className="space-y-4">
            <TituloSeccion>Proyectos anteriores</TituloSeccion>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{otros.map((x, i) => <TarjetaProyecto key={x.id} x={x} i={i + 4} />)}</ul>
          </section>
        )}
      </>
    );
  }

  const nuevo = <Link href="/cliente/tickets/nuevo?tipo=nuevo" className={btnPrincipal}><IconMas data-gira="" /><Swap>Pedir un proyecto nuevo</Swap></Link>;
  return (
    <>
      <Encabezado eyebrow="Tus sistemas" titulo="Proyectos"
        detalle={activos.length > 1 ? `Tienes ${activos.length} proyectos en curso. Elige uno para ver sus fases, el avance en vivo y en qué fase se paga cada parte.` : "Cada proyecto con sus fases, el avance en vivo y en qué fase se paga cada parte."}
        accion={proyectos.length ? undefined : nuevo} />
      {proyectos.length === 0 ? (
        <Tarjeta i={1}>
          <Vacio titulo="Todavía no hay proyectos" texto="Cuando Pime cargue un proyecto o una modificación para ti, aparece aquí con sus fases, su avance y lo que se paga en cada una. Si tienes una idea, cuéntanosla en un ticket." accion={nuevo} />
        </Tarjeta>
      ) : (
        <>
          {activos.length > 0 && (
            <section className="space-y-4">
              <TituloSeccion>En curso</TituloSeccion>
              <ul className="grid gap-6 md:grid-cols-2">{activos.map((x, i) => <TarjetaProyecto key={x.id} x={x} i={i + 1} />)}</ul>
            </section>
          )}
          {otros.length > 0 && (
            <section className="space-y-4">
              <TituloSeccion>{activos.length ? "Anteriores" : "Tus proyectos"}</TituloSeccion>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{otros.map((x, i) => <TarjetaProyecto key={x.id} x={x} i={i + 1 + activos.length} />)}</ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
