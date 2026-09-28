"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MEETING_STATUS_LABEL } from "./status";

const STATUSES = ["READY", "TRANSCRIBED", "PROCESSING", "RECORDING", "DRAFT", "FAILED"];

interface MeetingsFiltersProps {
  projects: { id: string; name: string }[];
  clients: { id: string; name: string }[];
}

/**
 * Buscador y filtros del listado.
 *
 * La búsqueda no se queda en el título: entra a la transcripción, porque de una
 * reunión uno se acuerda de lo que se dijo —"la del cambio de alcance"— y casi
 * nunca de cómo se llamó el archivo.
 *
 * El estado vive en la URL para que una búsqueda se pueda compartir y para que
 * volver desde el detalle no borre el filtro.
 */
export function MeetingsFilters({ projects, clients }: MeetingsFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const projectId = params.get("projectId") ?? "";
  const clientId = params.get("clientId") ?? "";
  const status = params.get("status") ?? "";
  const active = q || projectId || clientId || status;

  function push(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    router.replace(sp.toString() ? `/empresa/reuniones?${sp}` : "/empresa/reuniones");
  }

  // El texto se aplica con retardo: escribir dispara una consulta que recorre
  // transcripciones enteras y no queremos una por tecla.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const timer = setTimeout(() => push({ q }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const selectClass =
    "field-select w-full min-w-0 lg:w-auto min-h-11 sm:min-h-10 bg-canvas border border-line rounded-lg pl-3 pr-8 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none";

  return (
    <div className="space-y-2 mb-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por título o por lo que se dijo en la reunión…"
        className="w-full min-h-11 sm:min-h-10 bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
      />
      {/* Filtros en columnas iguales de dos; el que queda solo en su fila se
          estira. Desde lg (con espacio de sobra) van en una fila. */}
      <div className="grid grid-cols-2 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2 lg:flex lg:flex-wrap">
        <select
          aria-label="Filtrar por proyecto"
          value={projectId}
          onChange={(e) => push({ projectId: e.target.value })}
          className={selectClass}
        >
          <option value="">Todo proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por cliente"
          value={clientId}
          onChange={(e) => push({ clientId: e.target.value })}
          className={selectClass}
        >
          <option value="">Todo cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => push({ status: e.target.value })}
          className={selectClass}
        >
          <option value="">Todo estado</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {MEETING_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {active && (
          <button
            onClick={() => {
              setQ("");
              router.replace("/empresa/reuniones");
            }}
            className="min-h-11 sm:min-h-10 px-3 py-2 rounded-lg border border-line text-fg-mute hover:text-fg text-sm transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
