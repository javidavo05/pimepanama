"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateDocumentAction } from "@/app/(empresa)/empresa/actions";

interface ContractOption {
  id: string;
  title: string;
  status: string;
}

interface LinkContractPanelProps {
  documentId: string;
  contracts: ContractOption[];
  createHref: string;
}

export function LinkContractPanel({ documentId, contracts, createHref }: LinkContractPanelProps) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleLink() {
    if (!selected) return;
    startTransition(async () => {
      await updateDocumentAction(documentId, { contractId: selected });
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="bg-panel border border-green-500/20 rounded-xl p-5">
        <p className="text-ok text-sm font-medium">✓ Contrato vinculado correctamente</p>
        <p className="text-fg-dim text-xs mt-1">Recarga la página para ver el pipeline actualizado.</p>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-amber-500/20 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-warn text-sm">⚠</span>
        <p className="text-fg-mute text-sm font-medium">Sin contrato vinculado</p>
      </div>
      <p className="text-fg-dim text-xs">
        Vincula este documento a su contrato de origen para un pipeline completo.
      </p>

      {contracts.length === 0 ? (
        <Link
          href={createHref}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-fill border border-line text-fg-dim text-xs hover:text-fg hover:border-line-loud transition-all"
        >
          + Crear contrato retroactivo
        </Link>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Contrato a vincular"
            className="flex-1 bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand/40 transition-all"
          >
            <option value="">Seleccionar contrato...</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.status === "ACTIVE" ? "✓" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={handleLink}
            disabled={!selected || pending}
            className="px-4 py-2 rounded-lg bg-brand/10 border border-brand/25 text-brand-fg text-sm font-medium hover:bg-brand/15 disabled:opacity-40 transition-all shrink-0"
          >
            {pending ? "Vinculando..." : "Vincular"}
          </button>
        </div>
      )}
    </div>
  );
}
