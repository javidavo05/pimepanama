"use client";

import { useState, useTransition } from "react";
import { createRetroactiveLeadAction } from "@/app/(empresa)/empresa/actions";

interface CreateRetroactiveLeadButtonProps {
  documentId: string;
}

export function CreateRetroactiveLeadButton({ documentId }: CreateRetroactiveLeadButtonProps) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await createRetroactiveLeadAction(documentId);
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear el lead");
      }
    });
  }

  if (done) {
    return <span className="text-green-400 text-xs">✓ Lead creado y vinculado</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs hover:text-white hover:border-white/20 disabled:opacity-50 transition-all"
      >
        {pending ? "Creando..." : "+ Crear lead retroactivo"}
      </button>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}
