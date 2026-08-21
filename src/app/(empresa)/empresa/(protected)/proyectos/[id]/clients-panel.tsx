"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Client } from "@prisma/client";
import { setProjectClientsAction } from "@/app/(empresa)/empresa/actions";
import { INPUT_CLASS, type ProjectClientRef } from "./types";

interface ClientsPanelProps {
  projectId: string;
  clients: ProjectClientRef[];
  allClients: Client[];
}

/**
 * Asignar el cliente del proyecto sin pasar por el formulario de edición.
 * El primero de la lista es el principal: es el que se copia a `Project.clientId`
 * y el que llega precargado al facturar o al crear el contrato.
 */
export function ClientsPanel({ projectId, clients, allClients }: ClientsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const empty = clients.length === 0;
  const available = allClients.filter((c) => !clients.some((s) => s.id === c.id));

  function save(ids: string[]) {
    setError(null);
    startTransition(async () => {
      try {
        await setProjectClientsAction(projectId, ids);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el cliente");
      }
    });
  }

  const ids = clients.map((c) => c.id);

  return (
    <div
      className={`bg-[#0a0a10] border rounded-xl p-5 space-y-3 ${
        empty ? "border-amber-500/25" : "border-white/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-[10px] uppercase tracking-widest">
          {empty ? "⚠ Sin cliente asignado" : clients.length > 1 ? "Clientes" : "Cliente"}
        </p>
        <Link
          href="/empresa/clientes"
          className="text-white/35 text-[10px] hover:text-white/60 transition-colors"
        >
          ver clientes →
        </Link>
      </div>

      {empty ? (
        <p className="text-white/55 text-xs">
          El proyecto tiene que pertenecer a alguien: sin cliente no se puede facturar ni
          precargar el contrato.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {clients.map((c, i) => (
            <li key={c.id} className="flex items-center justify-between gap-2 group">
              <div className="min-w-0">
                <Link
                  href={`/empresa/clientes/${c.id}`}
                  className="text-white/75 text-sm hover:text-[#1AA7F0] transition-colors truncate block"
                >
                  {c.name}
                </Link>
                <p className="text-white/40 text-[11px] truncate">
                  {c.company ?? ""}
                  {i === 0 && (
                    <span className="text-[9px] uppercase tracking-widest text-[#C8A96E]/70 ml-1">
                      principal
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => save([c.id, ...ids.filter((x) => x !== c.id)])}
                    disabled={pending}
                    className="text-white/40 hover:text-[#C8A96E] text-[10px] transition-colors disabled:opacity-40"
                  >
                    principal
                  </button>
                )}
                {clients.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Quitar ${c.name}`}
                    onClick={() => save(ids.filter((x) => x !== c.id))}
                    disabled={pending}
                    className="text-white/40 hover:text-red-400 text-xs transition-colors disabled:opacity-40"
                  >
                    ×
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <select
          value=""
          aria-label={empty ? "Asignar cliente" : "Agregar cliente"}
          disabled={pending}
          onChange={(e) => e.target.value && save([...ids, e.target.value])}
          className={`${INPUT_CLASS} py-2 text-xs disabled:opacity-40`}
        >
          <option value="">
            {pending ? "Guardando…" : empty ? "Asignar cliente…" : "+ agregar otro cliente…"}
          </option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.company ? ` — ${c.company}` : ""}
            </option>
          ))}
        </select>
      ) : (
        allClients.length === 0 && (
          <Link
            href="/empresa/clientes"
            className="inline-block text-[#1AA7F0]/70 text-xs hover:text-[#1AA7F0] transition-colors"
          >
            + Crear un cliente primero
          </Link>
        )
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
