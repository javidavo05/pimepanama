"use client";

/**
 * Al elegir el cliente o el proyecto de una reunión, todo lo del cliente sale enseguida: sus proyectos
 * con la fase en curso, lo que debe y lo último que se habló. Los datos ya vienen cargados con la página.
 *
 * `enlazar` resuelve la otra mitad sola:
 * - eliges un proyecto → el cliente es el de ese proyecto;
 * - eliges un cliente → el proyecto es su proyecto activo más reciente (si el elegido no era suyo).
 */
import Link from "@/components/empresa/link";
import type { ProyectoOpcion, ResumenClienteReunion } from "@/lib/meetings/clientes-contexto";
import { fechaCorta } from "@/lib/format-datetime";

// Mismo formato que dinero() de portal/datos, que no se puede importar aquí: arrastra Prisma al navegador.
const fmt = new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const dinero = (v: number) => fmt.format(Number.isFinite(v) ? v : 0);

export function enlazar(
  cambio: { proyecto: string } | { cliente: string },
  actual: { proyecto: string; cliente: string },
  proyectos: ProyectoOpcion[],
  resumenes: Record<string, ResumenClienteReunion>
): { proyecto: string; cliente: string } {
  if ("proyecto" in cambio) {
    const p = proyectos.find((x) => x.id === cambio.proyecto);
    return { proyecto: cambio.proyecto, cliente: p?.clientId ?? actual.cliente };
  }
  const cliente = cambio.cliente;
  const suyo = proyectos.find((x) => x.id === actual.proyecto)?.clientId === cliente;
  if (!cliente || suyo) return { proyecto: actual.proyecto, cliente };
  const activo = resumenes[cliente]?.proyectos.find((p) => p.status === "ACTIVE" || p.status === "PAUSED");
  return { proyecto: activo?.id ?? "", cliente };
}

/** Proyectos del cliente elegido primero, luego el resto: el que buscas queda arriba. */
export function OpcionesProyecto({ proyectos, cliente, nombreCliente }: { proyectos: ProyectoOpcion[]; cliente: string; nombreCliente?: string }) {
  const suyos = cliente ? proyectos.filter((p) => p.clientId === cliente) : [];
  const otros = cliente ? proyectos.filter((p) => p.clientId !== cliente) : proyectos;
  if (!suyos.length) return <>{otros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</>;
  return (
    <>
      <optgroup label={nombreCliente ? `De ${nombreCliente}` : "De este cliente"}>
        {suyos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </optgroup>
      {otros.length > 0 && (
        <optgroup label="Otros proyectos">
          {otros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </optgroup>
      )}
    </>
  );
}

export function ClienteAlElegir({ clienteId, nombre, resumen, proyectoId }: { clienteId: string; nombre: string; resumen: ResumenClienteReunion | undefined; proyectoId: string }) {
  const r = resumen ?? { proyectos: [], porCobrar: 0, pagado: 0, reuniones: 0, ultima: null };
  const vacio = !r.proyectos.length && !r.reuniones && !r.pagado && !r.porCobrar;
  return (
    <section aria-label={`Lo de ${nombre}`} className="rounded-xl border border-line bg-fill p-4 space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-fg text-sm font-semibold [overflow-wrap:anywhere]">{nombre}</p>
          <p className="text-fg-dim text-xs tabular-nums">
            {r.proyectos.length} {r.proyectos.length === 1 ? "proyecto" : "proyectos"} · {r.reuniones} {r.reuniones === 1 ? "reunión" : "reuniones"} · cobrado {dinero(r.pagado)}
            {r.porCobrar > 0.005 && <> · <span className="text-warn">por cobrar {dinero(r.porCobrar)}</span></>}
          </p>
        </div>
        <Link href={`/empresa/clientes/${clienteId}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline shrink-0">Ver ficha</Link>
      </div>
      {vacio ? (
        <p className="text-fg-dim text-sm">Cliente nuevo: todavía no tiene proyectos, pagos ni reuniones. Esta será la primera.</p>
      ) : (
        <>
          {r.proyectos.length > 0 && (
            <ul className="space-y-1">
              {r.proyectos.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={`min-w-0 [overflow-wrap:anywhere] ${p.id === proyectoId ? "text-fg font-medium" : "text-fg-mute"}`}>
                    {p.name}{p.fase ? <span className="text-fg-dim font-normal"> · {p.fase}</span> : null}
                  </span>
                  <span className="text-fg-dim text-xs tabular-nums shrink-0">{Math.round(p.avance)} %</span>
                </li>
              ))}
            </ul>
          )}
          {r.ultima && (
            <div className="border-t border-line pt-3 min-w-0">
              <p className="text-fg-dim text-xs">Última reunión · {fechaCorta(r.ultima.fecha)} · {r.ultima.title}</p>
              <p className="mt-1 text-fg-mute text-sm leading-relaxed line-clamp-3 [overflow-wrap:anywhere]">
                {r.ultima.resumen || "Sin resumen todavía."}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
