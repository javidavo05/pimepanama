"use client";

/**
 * Listas reales de GitHub, Vercel y Supabase para elegir repo o proyecto. Pasan por
 * /api/empresa/platforms/live (caché de 30 min en el servidor) y se recuerdan en esta pestaña para no
 * volver a pedirlas al ir y venir entre pasos.
 */
import { useCallback, useEffect, useState } from "react";
import type { GithubRepoItem, SupabaseProjectItem, VercelProjectItem } from "@/lib/platforms/externo";
import type { LiveListResponse } from "@/lib/platforms/tipos";
import { mejorCoincidencia } from "@/lib/platforms/enlazar";
import { Icon } from "@/components/empresa/tasks/task-parts";
import { hace, inputCls, labelCls, LOCAL_ICON, pedirJson, supabaseEstado, vercelEstado } from "./ui";

export type RemoteProvider = "github" | "vercel" | "supabase";
export type RemoteItem<P extends RemoteProvider> = P extends "github" ? GithubRepoItem : P extends "vercel" ? VercelProjectItem : SupabaseProjectItem;

type Estado<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; items: T[]; fetchedAt: string | null; error: string | null; auth: boolean }
  | { status: "error"; error: string };

const memoria = new Map<string, Promise<LiveListResponse<unknown> | { error: string }>>();

export function cargarLista<P extends RemoteProvider>(provider: P, accountId: string, refresh = false): Promise<LiveListResponse<RemoteItem<P>> | { error: string }> {
  const key = `${provider}:${accountId}`;
  if (!refresh && memoria.has(key)) return memoria.get(key) as Promise<LiveListResponse<RemoteItem<P>> | { error: string }>;
  const p = pedirJson<LiveListResponse<RemoteItem<P>>>(`/api/empresa/platforms/live?provider=${provider}&account=${encodeURIComponent(accountId)}${refresh ? "&refresh=1" : ""}`).then((r) =>
    r.error !== undefined ? { error: r.error } : r.data
  );
  memoria.set(key, p as Promise<LiveListResponse<unknown> | { error: string }>);
  // Un error no se recuerda: el siguiente intento vuelve a pedir.
  void p.then((r) => {
    if ("error" in r && !("items" in r)) memoria.delete(key);
  });
  return p;
}

export function useListaRemota<P extends RemoteProvider>(provider: P, accountId: string | null) {
  const [estado, setEstado] = useState<Estado<RemoteItem<P>>>({ status: "idle" });

  const cargar = useCallback(
    async (refresh = false) => {
      if (!accountId) {
        setEstado({ status: "idle" });
        return;
      }
      setEstado({ status: "loading" });
      const r = await cargarLista(provider, accountId, refresh);
      if ("items" in r) setEstado({ status: "ready", items: r.items, fetchedAt: r.fetchedAt, error: r.error, auth: r.auth });
      else setEstado({ status: "error", error: r.error });
    },
    [provider, accountId]
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { estado, recargar: () => cargar(true) };
}

export function nombreDeItem(provider: RemoteProvider, it: GithubRepoItem | VercelProjectItem | SupabaseProjectItem): string {
  if (provider === "github") return (it as GithubRepoItem).fullName;
  return (it as VercelProjectItem | SupabaseProjectItem).name;
}

export function claveDeItem(provider: RemoteProvider, it: GithubRepoItem | VercelProjectItem | SupabaseProjectItem): string {
  if (provider === "github") return (it as GithubRepoItem).fullName;
  if (provider === "vercel") return (it as VercelProjectItem).id;
  return (it as SupabaseProjectItem).ref;
}

function detalleDeItem(provider: RemoteProvider, it: GithubRepoItem | VercelProjectItem | SupabaseProjectItem): string {
  if (provider === "github") {
    const r = it as GithubRepoItem;
    return [r.private ? "privado" : "público", r.pushedAt ? `último push ${hace(r.pushedAt)}` : null].filter(Boolean).join(" · ");
  }
  if (provider === "vercel") {
    const v = it as VercelProjectItem;
    return [vercelEstado(v.deployState)?.label, v.domain].filter(Boolean).join(" · ");
  }
  const s = it as SupabaseProjectItem;
  return [supabaseEstado(s.status)?.label, s.region].filter(Boolean).join(" · ");
}

/** Mejor candidato de la lista para los nombres dados (cliente, proyecto, plataforma). */
export function sugerido<P extends RemoteProvider>(provider: P, items: RemoteItem<P>[], nombres: string[]): RemoteItem<P> | null {
  return mejorCoincidencia(nombres, items, (it) => nombreDeItem(provider, it));
}

const NOUN: Record<RemoteProvider, { one: string; label: string; empty: string }> = {
  github: { one: "repo", label: "Repositorio", empty: "Esta cuenta no tiene repositorios que el token pueda leer." },
  vercel: { one: "proyecto", label: "Proyecto de Vercel", empty: "Esta cuenta no tiene proyectos en Vercel todavía." },
  supabase: { one: "proyecto", label: "Proyecto de Supabase", empty: "Esta cuenta no tiene proyectos en Supabase todavía." },
};

/**
 * Selector de repo o proyecto con su carga, error, vacío y «Actualizar». Si nada está elegido y hay un
 * candidato claro por nombre, lo propone (lo marca) para que baste con seguir.
 */
export function SelectorRemoto<P extends RemoteProvider>({
  id,
  provider,
  accountId,
  value,
  onChange,
  nombres,
  autoProponer = true,
}: {
  id: string;
  provider: P;
  accountId: string;
  /** Clave elegida: full name del repo, id de Vercel o ref de Supabase. */
  value: string | null;
  onChange: (key: string | null, item: RemoteItem<P> | null) => void;
  nombres: string[];
  autoProponer?: boolean;
}) {
  const { estado, recargar } = useListaRemota(provider, accountId);
  const noun = NOUN[provider];

  const items = estado.status === "ready" ? estado.items : [];
  const propuesto = estado.status === "ready" ? sugerido(provider, estado.items, nombres) : null;
  const propuestoKey = propuesto ? claveDeItem(provider, propuesto) : null;

  useEffect(() => {
    if (autoProponer && !value && propuesto) onChange(claveDeItem(provider, propuesto), propuesto);
    // Solo al llegar la lista: después manda lo que elija la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propuestoKey]);

  if (estado.status === "idle" || estado.status === "loading") {
    return (
      <div aria-busy="true">
        <p className={labelCls}>{noun.label}</p>
        <div className="h-11 rounded-lg bg-fill-2 animate-pulse" />
        <p className="text-xs text-fg-dim mt-1">Trayendo la lista real…</p>
      </div>
    );
  }

  if (estado.status === "error") {
    return (
      <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
        <p>{estado.error}</p>
        <button type="button" onClick={() => void recargar()} className="mt-1 min-h-11 sm:min-h-8 font-semibold underline">
          Reintentar
        </button>
      </div>
    );
  }

  const elegido = value ? items.find((it) => claveDeItem(provider, it) === value) ?? null : null;
  const ordenados = [...items].sort((a, b) => nombreDeItem(provider, a).localeCompare(nombreDeItem(provider, b), "es", { sensitivity: "base" }));

  return (
    <div className="space-y-1">
      <label htmlFor={id} className={labelCls}>
        {noun.label}
      </label>
      {items.length === 0 ? (
        <p className="rounded-lg border border-line bg-fill px-3 py-2 text-sm text-fg-dim">{estado.error ?? noun.empty}</p>
      ) : (
        <select
          id={id}
          value={value ?? ""}
          onChange={(e) => {
            const k = e.target.value || null;
            onChange(k, k ? items.find((it) => claveDeItem(provider, it) === k) ?? null : null);
          }}
          className={inputCls}
        >
          <option value="">Sin {noun.one}</option>
          {propuesto && (
            <optgroup label="Coincide con el nombre">
              <option value={claveDeItem(provider, propuesto)}>{nombreDeItem(provider, propuesto)}</option>
            </optgroup>
          )}
          <optgroup label={`Todos (${items.length})`}>
            {ordenados
              .filter((it) => claveDeItem(provider, it) !== propuestoKey)
              .map((it) => (
                <option key={claveDeItem(provider, it)} value={claveDeItem(provider, it)}>
                  {nombreDeItem(provider, it)}
                </option>
              ))}
          </optgroup>
          {value && !elegido && <option value={value}>{value} (ya no aparece en la cuenta)</option>}
        </select>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-fg-dim">
        <span className="min-w-0 [overflow-wrap:anywhere]">
          {elegido ? detalleDeItem(provider, elegido) : value ? "No está en la lista de esta cuenta. ¿Se movió o lo borraron?" : estado.fetchedAt ? `Lista de ${hace(estado.fetchedAt)}` : null}
        </span>
        <button type="button" onClick={() => void recargar()} className="inline-flex items-center gap-1 min-h-11 sm:min-h-8 text-brand-fg hover:underline">
          <Icon d={LOCAL_ICON.refresh} className="w-4 h-4" />
          Actualizar lista
        </button>
      </div>
      {estado.error && items.length > 0 && <p className="text-xs text-warn">Mostrando la última lista guardada: {estado.error}</p>}
    </div>
  );
}
