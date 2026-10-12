"use client";

/**
 * Filtros de tickets que no son pestañas: por proyecto y solo los internos (productos de la empresa).
 * Viven en la URL para que volver desde un ticket no los borre.
 */
import { useRouter, useSearchParams } from "next/navigation";

export function TicketsFiltros({ proyectos }: { proyectos: { id: string; nombre: string; interno: boolean }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const proyecto = params.get("proyecto") ?? "";
  const internos = params.get("internos") === "1";

  function poner(cambios: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.replace(sp.toString() ? `/empresa/tickets?${sp}` : "/empresa/tickets");
  }

  const visibles = internos ? proyectos.filter((p) => p.interno) : proyectos;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        aria-label="Filtrar por proyecto"
        value={proyecto}
        onChange={(e) => poner({ proyecto: e.target.value || null })}
        className="field-select w-full sm:w-80 min-w-0 min-h-11 sm:min-h-10 bg-canvas border border-line rounded-lg pl-3 pr-8 py-2 text-fg text-base sm:text-sm focus:border-brand/50 focus:outline-none"
      >
        <option value="">Todo proyecto</option>
        {visibles.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <button
        type="button"
        aria-pressed={internos}
        onClick={() => poner({ internos: internos ? null : "1", proyecto: null })}
        className={`inline-flex items-center justify-center gap-2 min-h-11 sm:min-h-10 px-4 rounded-lg border text-sm font-medium transition-colors ${
          internos ? "border-brand/40 bg-brand/10 text-brand-fg" : "border-line text-fg-dim hover:text-fg-mute"
        }`}
      >
        Internos
      </button>
    </div>
  );
}
