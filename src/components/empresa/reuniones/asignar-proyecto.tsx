"use client";

/**
 * Asignar el proyecto a una reunión que no tiene, sin entrar a ella.
 *
 * - Con sugerencia: un toque («Asignar a HOLO REALTY»). La sugerencia dice de dónde sale (cliente, título
 *   o notas) para que se pueda confiar o no.
 * - Sin sugerencia, o si la sugerida no es: la lista de proyectos, y al elegir se guarda (dos toques).
 *
 * La reunión hereda el cliente del proyecto si no tenía uno (lo hace el servidor).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Opcion = { id: string; name: string };

export function AsignarProyecto({
  meetingId,
  proyectos,
  sugerido,
  className = "",
}: {
  meetingId: string;
  proyectos: Opcion[];
  sugerido?: (Opcion & { motivo: string }) | null;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  async function asignar(projectId: string) {
    if (!projectId) return;
    setGuardando(projectId);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo asignar el proyecto");
      }
      setHecho(proyectos.find((p) => p.id === projectId)?.name ?? "el proyecto");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar el proyecto");
    } finally {
      setGuardando(null);
    }
  }

  if (hecho) {
    return (
      <p className={`text-ok text-sm ${className}`} role="status">
        Asignada a <span className="font-medium">{hecho}</span>
        {pending && <span className="text-fg-dim"> · actualizando…</span>}
      </p>
    );
  }

  if (!proyectos.length) {
    return <p className={`text-fg-dim text-sm ${className}`}>No hay proyectos todavía: crea uno y asígnala desde aquí.</p>;
  }

  const otros = sugerido ? proyectos.filter((p) => p.id !== sugerido.id) : proyectos;
  const ocupado = guardando !== null;

  return (
    <div className={`flex flex-col gap-2 min-w-0 ${className}`}>
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {sugerido && (
          <button
            type="button"
            onClick={() => void asignar(sugerido.id)}
            disabled={ocupado}
            className="inline-flex items-center justify-center gap-2 min-h-11 sm:min-h-10 px-4 rounded-lg border border-brand/40 bg-brand/10 text-brand-fg text-sm font-semibold hover:bg-brand/15 disabled:opacity-50 min-w-0 transition-colors"
          >
            <span className="truncate">{guardando === sugerido.id ? "Asignando…" : `Asignar a ${sugerido.name}`}</span>
          </button>
        )}
        {otros.length > 0 && (
          <select
            aria-label={sugerido ? "Asignar a otro proyecto" : "Asignar a un proyecto"}
            value=""
            disabled={ocupado}
            onChange={(e) => void asignar(e.target.value)}
            className="field-select w-full sm:w-auto min-w-0 min-h-11 sm:min-h-10 bg-canvas border border-line rounded-lg pl-3 pr-8 py-2 text-fg text-base sm:text-sm focus:border-brand/50 focus:outline-none disabled:opacity-50"
          >
            <option value="">{guardando && guardando !== sugerido?.id ? "Asignando…" : sugerido ? "Otro proyecto…" : "Asignar a un proyecto…"}</option>
            {otros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {sugerido && <p className="text-fg-faint text-xs">Sugerido {sugerido.motivo}.</p>}
      {error && (
        <p className="text-danger text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
