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
      <div className="bg-[#0a0a10] border border-green-500/20 rounded-xl p-5">
        <p className="text-green-400 text-sm font-medium">✓ Contrato vinculado correctamente</p>
        <p className="text-white/55 text-xs mt-1">Recarga la página para ver el pipeline actualizado.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a10] border border-amber-500/20 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-sm">⚠</span>
        <p className="text-white/70 text-sm font-medium">Sin contrato vinculado</p>
      </div>
      <p className="text-white/60 text-xs">
        Vincula este documento a su contrato de origen para un pipeline completo.
      </p>

      {contracts.length === 0 ? (
        <Link
          href={createHref}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs hover:text-white hover:border-white/20 transition-all"
        >
          + Crear contrato retroactivo
        </Link>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Contrato a vincular"
            className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all"
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
            className="px-4 py-2 rounded-lg bg-[#1AA7F0]/10 border border-[#1AA7F0]/25 text-[#1AA7F0] text-sm font-medium hover:bg-[#1AA7F0]/15 disabled:opacity-40 transition-all shrink-0"
          >
            {pending ? "Vinculando..." : "Vincular"}
          </button>
        </div>
      )}
    </div>
  );
}
