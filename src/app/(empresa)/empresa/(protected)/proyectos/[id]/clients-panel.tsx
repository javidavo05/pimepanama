"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Client } from "@prisma/client";
import { setProjectClientsAction } from "@/app/(empresa)/empresa/actions";
import { INPUT_COMPACT, type ProjectClientRef } from "./types";

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
      className={`bg-panel border rounded-xl p-5 space-y-3 ${
        empty ? "border-warn/25" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-fg-faint text-[10px] uppercase tracking-widest">
          {empty ? "⚠ Sin cliente asignado" : clients.length > 1 ? "Clientes" : "Cliente"}
        </p>
        <Link
          href="/empresa/clientes"
          className="inline-flex items-center min-h-11 sm:min-h-8 text-fg-ghost text-xs sm:text-[10px] hover:text-fg-dim transition-colors"
        >
          ver clientes →
        </Link>
      </div>

      {empty ? (
        <p className="text-fg-dim text-xs">
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
                  className="text-fg-soft text-sm hover:text-brand-fg transition-colors truncate block"
                >
                  {c.name}
                </Link>
                <p className="text-fg-ghost text-[11px] truncate">
                  {c.company ?? ""}
                  {i === 0 && (
                    <span className="text-[9px] uppercase tracking-widest text-sand-fg ml-1">
                      principal
                    </span>
                  )}
                </p>
              </div>
              {/* En pantallas táctiles no hay hover: las acciones quedan visibles
                  en el celular y solo se esconden desde tablet. */}
              <div className="flex items-center gap-2 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => save([c.id, ...ids.filter((x) => x !== c.id)])}
                    disabled={pending}
                    className="inline-flex items-center min-h-11 sm:min-h-8 px-2 sm:px-0 text-fg-ghost hover:text-sand-fg text-xs sm:text-[10px] transition-colors disabled:opacity-40"
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
                    className="inline-flex items-center justify-center w-11 h-11 sm:w-auto sm:h-auto text-fg-ghost hover:text-danger text-xs transition-colors disabled:opacity-40"
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
          className={`${INPUT_COMPACT} disabled:opacity-40`}
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
            className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg text-xs hover:text-brand-fg transition-colors"
          >
            + Crear un cliente primero
          </Link>
        )
      )}

      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
