"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeliverableKind, TechnicalDeliverable } from "@/lib/meetings/types";

const KIND_LABEL: Record<DeliverableKind, string> = {
  SISTEMA_NUEVO: "Sistema nuevo",
  MODIFICACION: "Modificación",
  PROPUESTA_COMERCIAL: "Propuesta comercial",
  CONTRATO: "Contrato",
  MANTENIMIENTO: "Mantenimiento",
  SEGUIMIENTO: "Seguimiento",
};

const KIND_COLOR: Record<DeliverableKind, string> = {
  SISTEMA_NUEVO: "bg-grape/15 text-grape-soft border-grape/25",
  MODIFICACION: "bg-brand/15 text-brand-fg border-brand/25",
  PROPUESTA_COMERCIAL: "bg-sand/15 text-sand-fg border-sand/25",
  CONTRATO: "bg-sand/15 text-sand-fg border-sand/25",
  MANTENIMIENTO: "bg-fill-2 text-fg-mute border-line-mid",
  SEGUIMIENTO: "bg-fill-2 text-fg-mute border-line-mid",
};

const DESTINATION_HINT: Record<string, string> = {
  PROPUESTA: "Esto todavía no está vendido: lo que toca es cotizarlo.",
  CONTRATO: "El alcance está cerrado; falta formalizarlo.",
  DESARROLLO: "Se puede construir directamente con el prompt técnico.",
};

interface DeliverablePanelProps {
  meetingId: string;
  deliverable: TechnicalDeliverable | null;
  hasProject: boolean;
  projectId: string | null;
  /** Repositorio conectado: sin él, el entregable no puede nombrar código real */
  hasRepo: boolean;
  deliverableId: string | null;
  contractId: string | null;
  proposalDraftedAt: string | null;
}

function List({ title, items, marker }: { title: string; items: string[]; marker: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-fg-ghost text-[10px] uppercase tracking-wider mb-1">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-fg-mute text-xs flex gap-1.5 leading-relaxed">
            <span className="text-brand-fg shrink-0">{marker}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * El entregable técnico de la reunión y sus salidas.
 *
 * Toda reunión en un entorno técnico mueve algo construible; esta pantalla dice
 * qué es y permite convertirlo en lo que corresponda —entregable del proyecto,
 * propuesta o contrato— sin volver a teclearlo en otro módulo.
 */
export function DeliverablePanel({
  meetingId,
  deliverable,
  hasProject,
  projectId,
  hasRepo,
  deliverableId,
  contractId,
  proposalDraftedAt,
}: DeliverablePanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function materialize(wants: { deliverable?: boolean; proposal?: boolean; contract?: boolean }) {
    setBusy(true);
    setError(null);
    setMessage([]);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}/materialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wants),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo materializar");
      setMessage([...(data.done ?? []), ...(data.skipped ?? [])]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo materializar");
    } finally {
      setBusy(false);
    }
  }

  if (!deliverable) {
    return (
      <p className="text-fg-ghost text-sm">
        Todavía no se determinó el entregable técnico. Corre la etapa «Entregable» — toda reunión
        deja uno, aunque sea el estado de lo que ya estaba en curso.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className={`px-2 py-0.5 text-[10px] rounded border ${KIND_COLOR[deliverable.kind]}`}>
            {KIND_LABEL[deliverable.kind]}
          </span>
          {deliverable.estimateHours && (
            <span className="text-fg-ghost text-[10px]">≈ {deliverable.estimateHours} h</span>
          )}
          {!hasRepo && (
            <span className="text-warn text-[10px]">
              sin repositorio conectado — no sabe qué existe ya
            </span>
          )}
        </div>
        <h3 className="text-fg text-base font-medium">{deliverable.title}</h3>
        <p className="text-fg-mute text-sm leading-relaxed mt-1.5 whitespace-pre-wrap">
          {deliverable.summary}
        </p>
        <p className="text-fg-ghost text-xs mt-2">{DESTINATION_HINT[deliverable.readyFor]}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <List title="Alcance" items={deliverable.scope} marker="·" />
        <List title="Fuera de alcance" items={deliverable.outOfScope} marker="×" />
        <List title="Criterios de aceptación" items={deliverable.acceptance} marker="✓" />
        <List title="Bloqueos" items={deliverable.blockers} marker="!" />
        <List title="Toca en el código" items={deliverable.touchedAreas} marker="→" />
        <List title="Se reutiliza lo que ya existe" items={deliverable.reuse} marker="↺" />
      </div>

      {deliverable.recommendation && (
        <div className="border border-line rounded-xl p-4">
          <p className="text-fg-ghost text-[10px] uppercase tracking-wider mb-1.5">
            Recomendación técnica
          </p>
          <p className="text-fg-soft text-sm leading-relaxed whitespace-pre-wrap">
            {deliverable.recommendation}
          </p>
        </div>
      )}

      <div className="pt-3 border-t border-line space-y-3">
        {!hasProject ? (
          <p className="text-warn text-xs">
            Asigna la reunión a un proyecto para poder crear el entregable, la propuesta o el
            contrato.
          </p>
        ) : (
          <>
            <p className="text-fg-ghost text-xs">
              Materializa el entregable sin volver a teclearlo en otro módulo. Lo que ya se creó no
              se duplica.
            </p>
            <div className="flex flex-wrap gap-2">
              {deliverableId ? (
                <Link
                  href={`/empresa/proyectos/${projectId}`}
                  className="px-4 py-2 bg-ok/10 border border-ok/20 text-ok text-xs rounded-lg transition-all"
                >
                  ✓ Entregable creado — ver proyecto
                </Link>
              ) : (
                <button
                  onClick={() => void materialize({ deliverable: true })}
                  disabled={busy}
                  className="px-4 py-2 bg-brand hover:bg-brand-hi disabled:opacity-40 text-on-brand text-xs font-semibold rounded-lg transition-all"
                >
                  + Crear entregable del proyecto
                </button>
              )}

              {proposalDraftedAt ? (
                <Link
                  href={`/empresa/proyectos/${projectId}`}
                  className="px-4 py-2 bg-ok/10 border border-ok/20 text-ok text-xs rounded-lg transition-all"
                >
                  ✓ Propuesta redactada
                </Link>
              ) : (
                <button
                  onClick={() => void materialize({ proposal: true })}
                  disabled={busy}
                  className="px-4 py-2 bg-sand/15 hover:bg-sand/25 disabled:opacity-40 border border-sand/25 text-sand-fg text-xs rounded-lg transition-all"
                >
                  📄 Redactar propuesta comercial
                </button>
              )}

              {contractId ? (
                <Link
                  href={`/empresa/contratos/${contractId}`}
                  className="px-4 py-2 bg-ok/10 border border-ok/20 text-ok text-xs rounded-lg transition-all"
                >
                  ✓ Contrato redactado — abrir
                </Link>
              ) : (
                <button
                  onClick={() => void materialize({ contract: true })}
                  disabled={busy}
                  className="px-4 py-2 bg-fill hover:bg-fill-2 disabled:opacity-40 border border-line text-fg-mute text-xs rounded-lg transition-all"
                >
                  📝 Redactar borrador de contrato
                </button>
              )}
            </div>
          </>
        )}

        {busy && <p className="text-fg-faint text-xs">Redactando… puede tardar medio minuto.</p>}
        {message.map((m, i) => (
          <p key={i} className="text-ok text-xs">
            {m}
          </p>
        ))}
        {error && <p className="text-danger text-xs">{error}</p>}
      </div>
    </div>
  );
}
