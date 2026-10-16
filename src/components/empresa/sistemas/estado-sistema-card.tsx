/**
 * Ficha del sistema dentro del proyecto: el resumen de la revisión única (salud, GitHub, fases, Pulso), qué falta
 * y adónde ir a resolverlo. Una sola tarjeta y un solo botón para revisar; todo lo demás de la pestaña es detalle.
 */
import Link from "@/components/empresa/link";
import type { Aviso, Revision } from "@/lib/motor/revision";
import { BotonVerificar } from "@/components/empresa/cobrar/boton-verificar";
import { EstadoSistemaPill, haceCuanto } from "./estado";
import { RevisionPill } from "./revision";

/** Adónde lleva cada aviso: las fases y el enlace del sistema para el cliente viven en «Fases y entregables». */
const IR: Record<Aviso["donde"], string | null> = { sistema: null, fases: "Ir a fases", enlace: "Cargar el enlace" };

function ListaAvisos({ projectId, items, tono }: { projectId: string; items: Aviso[]; tono: "aviso" | "sugerencia" }) {
  return (
    <ul className="space-y-2">
      {items.map((a) => {
        const ir = IR[a.donde];
        return (
          <li key={a.texto} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className={`min-w-0 [overflow-wrap:anywhere] ${tono === "aviso" ? "text-fg" : "text-fg-mute"}`}>{a.texto}</span>
            {ir && (
              <Link href={`/empresa/proyectos/${projectId}?tab=fases`} className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg hover:underline shrink-0">
                {ir}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function EstadoSistemaCard({ projectId, revision, revisadoAt }: { projectId: string; revision: Revision | null; revisadoAt: Date | null }) {
  const r = revision;
  return (
    <section className="bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-fg text-base font-semibold tracking-tight">Estado del sistema</h2>
            <RevisionPill estado={r?.estado} />
          </div>
          <p className="text-fg-dim text-sm">
            Pime lo revisa solo cada 30 min: si está en línea, GitHub y el avance de sus fases. {revisadoAt ? `Revisado ${haceCuanto(revisadoAt)}.` : "Todavía no se revisó."}
          </p>
        </div>
        <BotonVerificar projectId={projectId} />
      </div>

      {!r ? (
        <p className="text-fg-dim text-sm">Toca «Revisar ahora» para la primera revisión, o espera la próxima vuelta.</p>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-fill px-4 py-3 min-w-0 space-y-1">
              <dt className="text-fg-dim text-xs">En línea</dt>
              <dd className="space-y-1">
                {r.salud ? <EstadoSistemaPill status={r.salud.estado} /> : <span className="text-fg-mute text-sm">{r.enlace ? "Sin vigilar" : "Sin enlace"}</span>}
                {r.enlace && (
                  <a href={r.enlace} target="_blank" rel="noreferrer" className="flex items-center min-h-11 sm:min-h-8 text-xs text-brand-fg hover:underline [overflow-wrap:anywhere]">
                    {r.enlace.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                )}
              </dd>
            </div>
            <div className="rounded-xl bg-fill px-4 py-3 min-w-0 space-y-1">
              <dt className="text-fg-dim text-xs">{r.modo === "fases" ? "Fases que ve el cliente" : "Tipo"}</dt>
              <dd className="text-fg text-sm font-semibold tabular-nums">
                {r.modo === "fases" ? `${r.fases.avance} % · ${r.fases.conMarcador}/${r.fases.total} con marcador` : "Mantenimiento"}
              </dd>
              {r.modo === "mantenimiento" && <dd className="text-fg-dim text-xs">Sin fases: Pime vigila salud y errores.</dd>}
            </div>
            <div className="rounded-xl bg-fill px-4 py-3 min-w-0 space-y-1">
              <dt className="text-fg-dim text-xs">GitHub</dt>
              <dd className="text-fg text-sm font-semibold [overflow-wrap:anywhere]">{r.github ? (r.github.error ? "No se pudo leer" : r.github.repo) : "Sin repositorio"}</dd>
              {r.github && !r.github.error && <dd className="text-fg-dim text-xs">{r.github.commits30} cambios en 30 días{r.github.hook ? " · avance al instante" : ""}</dd>}
            </div>
          </dl>

          {r.avisos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-fg text-sm font-semibold">Qué falta</h3>
              <ListaAvisos projectId={projectId} items={r.avisos} tono="aviso" />
            </div>
          )}
          {r.sugerencias.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-fg-mute text-sm font-semibold">Para mejorar</h3>
              <ListaAvisos projectId={projectId} items={r.sugerencias} tono="sugerencia" />
            </div>
          )}
          {r.salud && (
            <Link href={`/empresa/sistemas/${r.salud.sistemaId}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">
              Ver errores, despliegues y llaves de Pulso
            </Link>
          )}
        </>
      )}
    </section>
  );
}
