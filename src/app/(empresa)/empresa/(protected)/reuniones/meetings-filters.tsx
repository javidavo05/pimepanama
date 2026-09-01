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
    "bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none";

  return (
    <div className="space-y-2 mb-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por título o por lo que se dijo en la reunión…"
        className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none"
      />
      <div className="flex gap-2 flex-wrap">
        <select
          value={projectId}
          onChange={(e) => push({ projectId: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos los proyectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={clientId}
          onChange={(e) => push({ clientId: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => push({ status: e.target.value })}
          className={selectClass}
        >
          <option value="">Cualquier estado</option>
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
            className="px-3 py-2 text-white/50 hover:text-white/80 text-xs transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
