"use client";

/**
 * Desde un proyecto: traer a él una reunión que quedó sin proyecto. La sugerida (por cliente, título o
 * notas) se enlaza de un toque; cualquier otra, eligiéndola de la lista.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/empresa/link";

type Reunion = { id: string; title: string; fecha: string; motivo?: string | null };

export function EnlazarReuniones({ projectId, sugeridas, otras }: { projectId: string; sugeridas: Reunion[]; otras: Reunion[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [guardando, setGuardando] = useState<string | null>(null);
  const [hechas, setHechas] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function enlazar(meetingId: string) {
    if (!meetingId) return;
    setGuardando(meetingId);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo enlazar la reunión");
      }
      setHechas((s) => new Set(s).add(meetingId));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enlazar la reunión");
    } finally {
      setGuardando(null);
    }
  }

  const pendientes = sugeridas.filter((m) => !hechas.has(m.id));
  const resto = otras.filter((m) => !hechas.has(m.id));
  if (!pendientes.length && !resto.length) return null;

  return (
    <section className="bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-4 min-w-0">
      <div className="min-w-0">
        <h2 className="text-fg text-base font-semibold tracking-tight">Reuniones sin proyecto</h2>
        <p className="text-fg-dim text-sm">
          {pendientes.length ? "Estas parecen de este proyecto. Enlázalas y suman su contexto a las siguientes." : "Si alguna era de este proyecto, enlázala aquí."}
        </p>
      </div>
      {pendientes.length > 0 && (
        <ul className="divide-y divide-line">
          {pendientes.map((m) => (
            <li key={m.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <Link href={`/empresa/reuniones/${m.id}`} className="min-w-0 group">
                <span className="block text-fg text-sm font-medium truncate group-hover:text-brand-fg">{m.title}</span>
                <span className="block text-fg-dim text-xs">{m.fecha}{m.motivo ? ` · sugerida ${m.motivo}` : ""}</span>
              </Link>
              <button
                type="button"
                onClick={() => void enlazar(m.id)}
                disabled={guardando !== null}
                className="inline-flex items-center justify-center min-h-11 sm:min-h-10 px-4 rounded-lg border border-brand/40 bg-brand/10 text-brand-fg text-sm font-semibold hover:bg-brand/15 disabled:opacity-50 transition-colors"
              >
                {guardando === m.id ? "Enlazando…" : "Enlazar a este proyecto"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {resto.length > 0 && (
        <select
          aria-label="Enlazar otra reunión sin proyecto"
          value=""
          disabled={guardando !== null}
          onChange={(e) => void enlazar(e.target.value)}
          className="field-select w-full min-w-0 min-h-11 sm:min-h-10 bg-canvas border border-line rounded-lg pl-3 pr-8 py-2 text-fg text-base sm:text-sm focus:border-brand/50 focus:outline-none disabled:opacity-50"
        >
          <option value="">{guardando && !sugeridas.some((m) => m.id === guardando) ? "Enlazando…" : "Enlazar otra reunión…"}</option>
          {resto.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title} · {m.fecha}
            </option>
          ))}
        </select>
      )}
      {error && (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
