"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ContractStatus } from "@prisma/client";
import {
  createContractAction,
  updateContractAction,
  deleteContractAction,
} from "@/app/(empresa)/empresa/actions";
import {
  CONTRACT_STATUS_COLOR,
  CONTRACT_STATUS_LABEL,
  INPUT_CLASS,
  LABEL_CLASS,
  fmtUSD,
  toDateInput,
  type Contract,
} from "./types";

interface ContractsPanelProps {
  projectId: string;
  projectName: string;
  clientId: string | null;
  /** Se usan como valores por defecto al crear el contrato. */
  defaults: { value: number | null; startsAt: string | null; endsAt: string | null; description: string | null };
  contracts: Contract[];
}

type Draft = {
  title: string;
  status: ContractStatus;
  value: string;
  startsAt: string;
  endsAt: string;
  responsibilities: string;
  terms: string;
};

const STATUS_OPTS: ContractStatus[] = ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"];

export function ContractsPanel({
  projectId,
  projectName,
  clientId,
  defaults,
  contracts,
}: ContractsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  function emptyDraft(): Draft {
    return {
      title: "",
      status: "ACTIVE",
      value: "",
      startsAt: "",
      endsAt: "",
      responsibilities: "",
      terms: "",
    };
  }

  function run(fn: () => Promise<unknown>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        after?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el contrato");
      }
    });
  }

  function startCreate() {
    setEditingId(null);
    setDraft({
      ...emptyDraft(),
      title: `Contrato — ${projectName}`,
      value: defaults.value != null ? String(defaults.value) : "",
      startsAt: toDateInput(defaults.startsAt),
      endsAt: toDateInput(defaults.endsAt),
    });
    setCreating(true);
  }

  function startEdit(c: Contract) {
    setCreating(false);
    setDraft({
      title: c.title,
      status: c.status as ContractStatus,
      value: c.value != null ? String(c.value) : "",
      startsAt: toDateInput(c.startsAt),
      endsAt: toDateInput(c.endsAt),
      responsibilities: c.responsibilities ?? "",
      terms: c.terms ?? "",
    });
    setEditingId(c.id);
  }

  function submitDraft() {
    if (!draft.title.trim()) {
      setError("El contrato necesita un título.");
      return;
    }
    const value = draft.value.trim() === "" ? null : Number(draft.value);
    if (value != null && Number.isNaN(value)) {
      setError("El valor del contrato no es un número válido.");
      return;
    }

    if (editingId) {
      // En edición se manda `null` a propósito: vaciar un campo tiene que
      // borrarlo, no dejar el valor anterior.
      run(
        () =>
          updateContractAction(editingId, {
            title: draft.title.trim(),
            status: draft.status,
            value,
            startsAt: draft.startsAt || null,
            endsAt: draft.endsAt || null,
            responsibilities: draft.responsibilities.trim() || null,
            terms: draft.terms.trim() || null,
          }),
        () => setEditingId(null)
      );
    } else {
      run(
        () =>
          createContractAction({
            title: draft.title.trim(),
            projectId,
            clientId: clientId ?? undefined,
            description: defaults.description ?? undefined,
            status: draft.status,
            value: value ?? defaults.value ?? undefined,
            startsAt: draft.startsAt || undefined,
            endsAt: draft.endsAt || undefined,
            responsibilities: draft.responsibilities.trim() || undefined,
            terms: draft.terms.trim() || undefined,
          }),
        () => setCreating(false)
      );
    }
  }

  const form = (
    <div className="px-5 py-4 space-y-3 bg-white/[0.015]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={LABEL_CLASS}>
            Título <span className="text-red-400">*</span>
          </label>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Valor (USD)</label>
          <input
            type="number"
            step="0.01"
            value={draft.value}
            onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
            placeholder={defaults.value != null ? String(defaults.value) : "0.00"}
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={LABEL_CLASS}>Vigente desde</label>
          <input
            type="date"
            value={draft.startsAt}
            onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Vigente hasta</label>
          <input
            type="date"
            value={draft.endsAt}
            onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Estado</label>
          <select
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as ContractStatus }))}
            className={INPUT_CLASS}
          >
            {STATUS_OPTS.map((s) => (
              <option key={s} value={s}>{CONTRACT_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Responsabilidades</label>
        <textarea
          rows={3}
          value={draft.responsibilities}
          onChange={(e) => setDraft((d) => ({ ...d, responsibilities: e.target.value }))}
          placeholder="Qué entrega cada parte..."
          className={`${INPUT_CLASS} resize-none text-white/80`}
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Términos</label>
        <textarea
          rows={3}
          value={draft.terms}
          onChange={(e) => setDraft((d) => ({ ...d, terms: e.target.value }))}
          placeholder="Condiciones de pago, plazos, penalidades..."
          className={`${INPUT_CLASS} resize-none text-white/80`}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => { setCreating(false); setEditingId(null); setError(null); }}
          className="text-white/50 hover:text-white/80 text-xs transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submitDraft}
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-[#1AA7F0]/10 border border-[#1AA7F0]/25 text-[#1AA7F0] text-xs font-medium hover:bg-[#1AA7F0]/15 disabled:opacity-40 transition-all"
        >
          {pending ? "Guardando..." : editingId ? "Guardar contrato" : "Crear contrato"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Contratos</h3>
        <button
          type="button"
          onClick={startCreate}
          className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors"
        >
          + agregar
        </button>
      </div>

      {error && <div className="px-5 pt-3 text-red-400 text-xs">{error}</div>}

      {contracts.length === 0 && !creating ? (
        <div className="px-5 py-6 text-white/50 text-sm text-center">
          Sin contratos. Créalo aquí mismo con «+ agregar».
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {contracts.map((c) =>
            editingId === c.id ? (
              <div key={c.id}>{form}</div>
            ) : (
              <div key={c.id} className="px-5 py-3 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/empresa/contratos/${c.id}`}
                        className="text-white/75 text-sm hover:text-[#1AA7F0] transition-colors truncate"
                      >
                        {c.title}
                      </Link>
                      <span className={`px-1.5 py-0.5 text-[9px] rounded border shrink-0 ${CONTRACT_STATUS_COLOR[c.status]}`}>
                        {CONTRACT_STATUS_LABEL[c.status]}
                      </span>
                      {c.signedAt && (
                        <span className="text-green-400/70 text-[10px] shrink-0">✓ firmado</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {c.value != null && (
                        <span className="text-[#C8A96E]/70 text-xs font-mono">${fmtUSD(c.value)}</span>
                      )}
                      {(c.startsAt || c.endsAt) && (
                        <span className="text-white/45 text-[11px]">
                          {c.startsAt ? new Date(c.startsAt).toLocaleDateString("es-PA") : "—"}
                          {" → "}
                          {c.endsAt ? new Date(c.endsAt).toLocaleDateString("es-PA") : "—"}
                        </span>
                      )}
                    </div>
                    {c.responsibilities && (
                      <p className="text-white/50 text-xs mt-1 line-clamp-2">{c.responsibilities}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="text-white/45 hover:text-[#1AA7F0] text-[10px] transition-colors"
                    >
                      editar
                    </button>
                    <Link
                      href={`/empresa/contratos/${c.id}`}
                      className="text-white/45 hover:text-white/80 text-[10px] transition-colors"
                    >
                      abrir →
                    </Link>
                  </div>
                </div>

                {confirmDeleteId === c.id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-white/55 text-[11px]">¿Eliminar este contrato?</span>
                    <button
                      type="button"
                      onClick={() => run(() => deleteContractAction(c.id), () => setConfirmDeleteId(null))}
                      disabled={pending}
                      className="text-red-400 text-[10px] hover:underline disabled:opacity-40"
                    >
                      sí, eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-white/45 text-[10px] hover:text-white/70"
                    >
                      cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(c.id)}
                    className="text-white/30 hover:text-red-400 text-[10px] mt-1 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    eliminar
                  </button>
                )}
              </div>
            )
          )}
          {creating && form}
        </div>
      )}
    </div>
  );
}
