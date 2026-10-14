"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ContractAnalyzer, type ContractAnalysis } from "@/components/empresa/contract-analyzer";
import {
  alcanceDesdeDocumento,
  describirPlan,
  fasesDesdeDocumento,
  planDesdeDocumento,
} from "@/lib/proyectos/desde-documento";
import { btn } from "@/components/empresa/page-header";
import { aplicarDocumentoAction } from "./acciones";

interface CompletarConDocumentoProps {
  projectId: string;
  /** Texto actual: decide si conviene reemplazarlo por el del documento. */
  description: string | null;
  scope: string | null;
  totalBudget: number | null;
  hasPlan: boolean;
  contractsCount: number;
  phasesCount: number;
  deliverablesCount: number;
  endDate: string | null;
}

type Eleccion = { fases: boolean; texto: boolean; presupuesto: boolean; plan: boolean; contrato: boolean };

const fmt = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/**
 * «Completar con un documento»: en un proyecto que ya existe se sube la propuesta, la cotización o el
 * contrato y se agrega lo que falta (fases, entregables, alcance, plan de pago, contrato en borrador).
 * Se eligen las partes antes de guardar y nada de lo que ya existe se borra.
 */
export function CompletarConDocumento(props: CompletarConDocumentoProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [analisis, setAnalisis] = useState<ContractAnalysis | null>(null);
  const [eleccion, setEleccion] = useState<Eleccion>({ fases: true, texto: false, presupuesto: false, plan: false, contrato: false });
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  const vacio = props.phasesCount === 0 && props.deliverablesCount === 0;
  const textoActual = `${props.description ?? ""}${props.scope ?? ""}`.trim();

  const propuesta = useMemo(() => {
    if (!analisis) return null;
    const fases = fasesDesdeDocumento(analisis);
    const alcance = alcanceDesdeDocumento(analisis);
    const plan = planDesdeDocumento(analisis, props.endDate?.slice(0, 10));
    return {
      fases,
      entregables: fases.reduce((n, f) => n + f.deliverables.length, 0),
      descripcion: analisis.description?.trim() || null,
      alcance: alcance || null,
      presupuesto: analisis.value ?? null,
      plan,
      contrato: analisis.contractTitle?.trim() ? analisis.contractTitle.trim() : null,
    };
  }, [analisis, props.endDate]);

  function alAnalizar(a: ContractAnalysis) {
    setAnalisis(a);
    setListo(null);
    setError(null);
    const textoNuevo = `${a.description ?? ""}${alcanceDesdeDocumento(a)}`.trim();
    // Lo que el proyecto no tiene se marca solo; lo que ya tiene queda a decisión de quien revisa.
    setEleccion({
      fases: true,
      texto: textoNuevo.length > textoActual.length,
      presupuesto: a.value != null && props.totalBudget == null,
      plan: !props.hasPlan,
      contrato: props.contractsCount === 0,
    });
  }

  function aplicar() {
    if (!analisis || !propuesta) return;
    setError(null);
    startTransition(async () => {
      const r = await aplicarDocumentoAction(props.projectId, {
        descripcion: eleccion.texto ? propuesta.descripcion : null,
        alcance: eleccion.texto ? propuesta.alcance : null,
        presupuesto: eleccion.presupuesto ? propuesta.presupuesto : null,
        fases: eleccion.fases ? propuesta.fases : [],
        plan: eleccion.plan ? propuesta.plan : null,
        contrato: eleccion.contrato && propuesta.contrato
          ? {
              title: propuesta.contrato,
              value: analisis.value ?? null,
              responsibilities: analisis.responsibilities ?? null,
              terms: analisis.terms ?? null,
              startsAt: analisis.startsAt ?? null,
              endsAt: analisis.endsAt ?? null,
              firmado: analisis.sourceType === "CONTRACT",
            }
          : null,
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      const partes = [
        r.fasesNuevas ? `${r.fasesNuevas} fase${r.fasesNuevas !== 1 ? "s" : ""} nueva${r.fasesNuevas !== 1 ? "s" : ""}` : "",
        r.fasesCompletadas ? `${r.fasesCompletadas} completada${r.fasesCompletadas !== 1 ? "s" : ""}` : "",
        `${r.entregables ?? 0} entregable${r.entregables !== 1 ? "s" : ""} agregado${r.entregables !== 1 ? "s" : ""}`,
        r.contratoId ? (analisis.sourceType === "CONTRACT" ? "contrato activo" : "contrato en borrador") : "",
      ].filter(Boolean);
      setListo(`Listo: ${partes.join(", ")}.`);
      setAnalisis(null);
      router.refresh();
    });
  }

  const opciones: { key: keyof Eleccion; titulo: string; detalle: string; visible: boolean }[] = propuesta
    ? [
        {
          key: "fases",
          titulo: `${propuesta.fases.length} fase${propuesta.fases.length !== 1 ? "s" : ""} con ${propuesta.entregables} entregable${propuesta.entregables !== 1 ? "s" : ""}`,
          detalle: props.phasesCount > 0
            ? "Las fases que ya existen con el mismo nombre solo reciben los entregables que les faltan; las demás se agregan al final."
            : "Se crean con su precio, cuándo se cobran y cada entregable con su detalle.",
          visible: propuesta.fases.length > 0,
        },
        {
          key: "texto",
          titulo: textoActual ? "Reemplazar descripción y alcance" : "Descripción y alcance",
          detalle: textoActual
            ? "Cambia el texto actual por el del documento, con lo que incluye, lo que no incluye y el plazo."
            : "Con lo que incluye, lo que no incluye y el plazo.",
          visible: !!(propuesta.descripcion || propuesta.alcance),
        },
        {
          key: "presupuesto",
          titulo: `Presupuesto ${propuesta.presupuesto != null ? fmt(propuesta.presupuesto) : ""}`,
          detalle: props.totalBudget != null ? `Hoy dice ${fmt(props.totalBudget)}.` : "El proyecto todavía no tiene presupuesto.",
          visible: propuesta.presupuesto != null && propuesta.presupuesto !== props.totalBudget,
        },
        {
          key: "plan",
          titulo: `Forma de pago: ${propuesta.plan ? describirPlan(propuesta.plan) : ""}`,
          detalle: props.hasPlan ? "Reemplaza el plan de pago actual." : "Se usa al facturar: cada pago aparece en Cuentas por Cobrar.",
          visible: !!propuesta.plan,
        },
        {
          key: "contrato",
          titulo: analisis?.sourceType === "CONTRACT" ? "Contrato (ya firmado)" : "Contrato en borrador para firmar",
          detalle: `${propuesta.contrato ?? ""}${props.contractsCount > 0 ? ` · el proyecto ya tiene ${props.contractsCount} contrato${props.contractsCount !== 1 ? "s" : ""}: este se agrega aparte` : ""}`,
          visible: !!propuesta.contrato,
        },
      ]
    : [];
  const visibles = opciones.filter((o) => o.visible);
  const algo = visibles.some((o) => eleccion[o.key]);

  const contenido = (
    <div className="space-y-4">
      <ContractAnalyzer onAnalyzed={alAnalizar} existingProject />

      {propuesta && (
        <div className="bg-panel border border-line rounded-xl p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="text-fg text-sm font-semibold">Qué se agrega al proyecto</h3>
            <p className="text-fg-faint text-xs mt-1">Nada de lo que ya tiene el proyecto se borra. Marca lo que quieres guardar.</p>
          </div>
          {visibles.length === 0 ? (
            <p className="text-fg-dim text-sm">El documento no trae nada nuevo para este proyecto.</p>
          ) : (
            <ul className="space-y-2">
              {visibles.map((o) => (
                <li key={o.key}>
                  <label className="flex items-start gap-3 min-h-11 rounded-lg border border-line p-3 cursor-pointer hover:bg-fill">
                    <input
                      type="checkbox"
                      checked={eleccion[o.key]}
                      onChange={(e) => setEleccion((x) => ({ ...x, [o.key]: e.target.checked }))}
                      className="mt-1 w-4 h-4 shrink-0 rounded border border-line-loud bg-fill accent-brand"
                    />
                    <span className="min-w-0">
                      <span className="block text-fg-soft text-sm break-words">{o.titulo}</span>
                      <span className="block text-fg-faint text-xs mt-1 break-words">{o.detalle}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-danger text-sm" role="alert">{error}</p>}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3">
            <button type="button" className={btn.secondary} onClick={() => setAnalisis(null)} disabled={pending}>
              Descartar
            </button>
            <button type="button" className={btn.primary} onClick={aplicar} disabled={pending || !algo}>
              {pending ? "Agregando…" : "Agregar al proyecto"}
            </button>
          </div>
        </div>
      )}

      {listo && <p className="text-ok text-sm" role="status">✓ {listo}</p>}
    </div>
  );

  // Un proyecto sin fases ni entregables lo necesita a la vista; uno ya armado lo tiene plegado.
  if (vacio) return contenido;
  return (
    <details className="group rounded-xl border border-line bg-panel" open={!!analisis || !!listo}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 min-h-11 px-4 sm:px-6 py-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-fg text-sm font-semibold">Ampliar con un documento</span>
          <span className="block text-fg-dim text-xs mt-1">Sube la propuesta, cotización o contrato y agrega lo que le falta al proyecto.</span>
        </span>
        <span className="text-fg-faint text-sm transition-transform group-open:rotate-180" aria-hidden>⌄</span>
      </summary>
      <div className="border-t border-line p-4 sm:p-6">{contenido}</div>
    </details>
  );
}
