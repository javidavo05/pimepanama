"use client";

import { useState, useTransition } from "react";
import { verificarGithubAction } from "@/app/(empresa)/empresa/(protected)/acciones-cobro";

export function BotonVerificar({ projectId }: { projectId: string }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button type="button" disabled={pendiente} onClick={() => { setError(null); iniciar(async () => { const r = await verificarGithubAction(projectId); if ("error" in r) setError(r.error); }); }}
        className="inline-flex items-center min-h-11 px-4 rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg disabled:opacity-60">
        {pendiente ? "Leyendo GitHub…" : "Verificar ahora"}
      </button>
      {error && <p className="text-danger text-xs max-w-xs" role="alert">{error}</p>}
    </div>
  );
}
