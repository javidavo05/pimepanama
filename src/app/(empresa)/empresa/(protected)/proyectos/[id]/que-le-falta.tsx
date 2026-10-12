"use client";

/**
 * «Qué le falta» al proyecto: barra de avance del enlace (cliente, fases, acuerdo, repo, plataforma,
 * reuniones, portal y cobro) y lo que falta, cada cosa con el botón que lleva a resolverla.
 *
 * - El primer pendiente lleva el botón en color de marca (el siguiente paso), sin relleno sólido: la acción
 *   principal de cada pestaña (Cobrar, Grabar…) sigue siendo la única llena en pantalla.
 * - «No aplica» saca el requisito de la cuenta (se guarda en el proyecto) y se puede deshacer abajo.
 * - La cuenta se hace aquí mismo con la misma función pura que en el servidor: marcar «No aplica» mueve la
 *   barra al instante, sin esperar la vuelta a la base.
 * - Se muestran tres pendientes; el resto, a un toque. Así la barra no empuja las pestañas fuera de la vista.
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/empresa/link";
import { irAPestana } from "@/components/empresa/clientes/ficha-tabs";
import { completitudProyecto, type DatosCompletitud, type Requisito } from "@/lib/proyectos/completitud";
import { marcarNoAplicaAction } from "./acciones";

const VISIBLES = 3;

const BTN = "inline-flex items-center justify-center min-h-11 sm:min-h-10 px-4 rounded-lg text-sm font-semibold text-center transition-colors min-w-0";
const SIGUIENTE = `${BTN} border border-brand/40 bg-brand/10 text-brand-fg hover:bg-brand/15`;
const CONTORNO = `${BTN} border border-line-mid hover:border-line-loud text-fg-mute hover:text-fg`;
const TEXTO = "inline-flex items-center justify-center min-h-11 sm:min-h-10 px-3 rounded-lg text-sm text-fg-dim hover:text-fg hover:bg-fill transition-colors disabled:opacity-50";

/** Botón que cambia de pestaña (con su entrada en el historial) y lleva la vista al punto que resuelve. */
function Ir({ tab, ancla, className, children }: { tab: string; ancla?: string; className: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => irAPestana(tab, ancla)} className={className}>
      {children}
    </button>
  );
}

export function QueLeFalta({ projectId, datos }: { projectId: string; datos: DatosCompletitud }) {
  const router = useRouter();
  // «No aplica» optimista: lo marcado se ve al instante; lo que llega del servidor manda.
  const [waived, setWaived] = useState(datos.waived);
  useEffect(() => setWaived(datos.waived), [datos.waived]);
  const c = useMemo(() => completitudProyecto({ ...datos, waived }), [datos, waived]);
  const [todos, setTodos] = useState(false);
  const [verListos, setVerListos] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const faltan = c.faltan;
  const visibles = todos ? faltan : faltan.slice(0, VISIBLES);
  const listos = c.requisitos.filter((r) => r.ok || r.waived || r.auto);
  const completo = faltan.length === 0;

  function noAplica(r: Requisito, valor: boolean) {
    const antes = waived;
    setGuardando(r.key);
    setError(null);
    setWaived(valor ? [...antes.filter((k) => k !== r.key), r.key] : antes.filter((k) => k !== r.key));
    startTransition(async () => {
      const res = await marcarNoAplicaAction(projectId, r.key, valor).catch(() => ({ error: "No se pudo guardar. Revisa la conexión y vuelve a intentar." }));
      if (res.error) {
        setError(res.error);
        setWaived(antes);
      } else router.refresh();
      setGuardando(null);
    });
  }

  return (
    <section aria-labelledby="que-le-falta" className="bg-panel border border-line rounded-2xl p-4 sm:p-6 mb-6 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="que-le-falta" className="text-fg text-base font-semibold tracking-tight">
          {completo ? "Proyecto completo" : "Qué le falta"}
        </h2>
        <p className="text-fg-dim text-sm tabular-nums">
          {c.cumplidos} de {c.aplican} · <span className={`font-semibold ${completo ? "text-ok" : "text-fg"}`}>{c.pct} %</span>
        </p>
      </div>
      <div
        className="mt-3 h-2 rounded-full bg-fill-3 overflow-hidden"
        role="progressbar"
        aria-valuenow={c.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Completitud del proyecto"
      >
        <div
          className={`h-full rounded-full origin-left transition-transform duration-500 ease-out motion-reduce:transition-none ${completo ? "bg-ok" : "bg-brand"}`}
          style={{ transform: `scaleX(${c.pct / 100})` }}
        />
      </div>
      {completo && (
        <p className="mt-3 text-fg-dim text-sm">Tiene todo enlazado: cliente, acuerdo, código, plataforma, reuniones y cobro.</p>
      )}

      {faltan.length > 0 && (
        <ul className="mt-4 divide-y divide-line">
          {visibles.map((r, i) => (
            <li key={r.key} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-fg text-sm font-medium">{r.label}</p>
                <p className="text-fg-dim text-xs leading-relaxed break-words">{r.detalle}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                {r.accion?.tipo === "pestana" && (
                  <Ir tab={r.accion.tab} ancla={r.accion.ancla} className={i === 0 ? SIGUIENTE : CONTORNO}>
                    {r.accion.label}
                  </Ir>
                )}
                {r.accion?.tipo === "enlace" && (
                  <Link href={r.accion.href} className={i === 0 ? SIGUIENTE : CONTORNO}>
                    {r.accion.label}
                  </Link>
                )}
                {r.waivable && (
                  <button type="button" onClick={() => noAplica(r, true)} disabled={pendiente} className={TEXTO} title={`Marcar «No aplica»: ${r.porQueNoAplica.toLowerCase()}`}>
                    {guardando === r.key ? "Guardando…" : "No aplica"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap gap-x-2">
        {faltan.length > VISIBLES && (
          <button type="button" onClick={() => setTodos((v) => !v)} aria-expanded={todos} className={TEXTO}>
            {todos ? "Ver menos" : `Ver ${faltan.length - VISIBLES} más`}
          </button>
        )}
        {listos.length > 0 && (
          <button type="button" onClick={() => setVerListos((v) => !v)} aria-expanded={verListos} className={TEXTO}>
            {verListos ? "Ocultar lo que ya está" : `Ver lo que ya está (${listos.length})`}
          </button>
        )}
      </div>

      {verListos && (
        <ul className="mt-2 divide-y divide-line">
          {listos.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
              <span className="min-w-0 text-sm">
                <span className={r.ok && !r.waived ? "text-ok" : "text-fg-faint"} aria-hidden>{r.ok && !r.waived ? "✓ " : "– "}</span>
                <span className="text-fg-mute">{r.label}</span>
                <span className="text-fg-dim text-xs">
                  {" · "}
                  {r.waived ? `No aplica (${r.porQueNoAplica.toLowerCase()})` : r.auto ? "No aplica: es interno" : r.detalle}
                </span>
              </span>
              {r.waived && (
                <button type="button" onClick={() => noAplica(r, false)} disabled={pendiente} className={TEXTO}>
                  {guardando === r.key ? "Guardando…" : "Sí aplica"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-2 text-danger text-sm" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
