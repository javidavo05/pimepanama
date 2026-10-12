"use client";

import { useCallback, useEffect, useState } from "react";
import { fechaCorta } from "@/lib/format-datetime";
import { AsistenteTokenGithub } from "@/components/empresa/github/asistente-token";
import { fetchLargo } from "@/lib/fetch-largo";

import type { EstadoRepo } from "@/lib/github/estado-repo";

type RepoState = EstadoRepo;

/**
 * El repositorio del proyecto.
 *
 * Es lo que separa un consejo genérico de uno útil: con el repo conectado, la
 * IA que analiza cada reunión sabe qué módulos existen, qué tablas hay y qué se
 * tocó la semana pasada, así que el entregable técnico y el master prompt hablan
 * de archivos reales en vez de decir «localizar el módulo que maneja X».
 *
 * No se guarda el código: se guarda su mapa —estructura, modelo de datos,
 * pantallas, endpoints, dependencias y las reglas del proyecto— y se vuelve a
 * leer cuando tú lo pides, no en cada análisis.
 */
export function RepoPanel({ projectId, inicial }: { projectId: string; inicial?: RepoState | null }) {
  // Llega armado del servidor: el panel no aparece vacío para luego saltar de tamaño.
  const [state, setState] = useState<RepoState | null>(inicial ?? null);
  const [input, setInput] = useState("");
  const [branch, setBranch] = useState("");
  const [asistente, setAsistente] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Un panel que no carga no rompe el detalle del proyecto: lo dice y ofrece reintentar.
  const [carga, setCarga] = useState<"cargando" | "lista" | "error">(inicial ? "lista" : "cargando");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/empresa/projects/${projectId}/repo`);
      if (!res.ok) throw new Error(String(res.status));
      setState(await res.json());
      setCarga("lista");
    } catch {
      setCarga((c) => (c === "lista" ? c : "error"));
    }
  }, [projectId]);

  useEffect(() => {
    if (!inicial) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  async function connect() {
    setBusy("connect");
    setError(null);
    setMessage(null);
    try {
      const res = await fetchLargo(`/api/empresa/projects/${projectId}/repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(input.trim() ? { repo: input.trim() } : {}),
          ...(branch.trim() ? { branch: branch.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo leer el repositorio");
      setInput("");
      setMessage(
        `Leído ${data.owner}/${data.repo}@${data.branch}: ${data.files} archivos, ${data.dataModels} modelos de datos${
          data.docs?.length ? `, reglas de ${data.docs.join(" y ")}` : ""
        }.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el repositorio");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    if (!confirm("Se desconecta el repositorio y se borra su mapa. Las reuniones dejarán de ver el código.")) {
      return;
    }
    setBusy("disconnect");
    try {
      await fetchLargo(`/api/empresa/projects/${projectId}/repo`, { method: "DELETE" });
      setMessage("Repositorio desconectado.");
      await load();
    } finally {
      setBusy(null);
    }
  }

  const connected = Boolean(state?.owner && state?.repo);

  if (carga !== "lista") {
    return (
      <div id="conectar-repo" tabIndex={-1} className="bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-3 scroll-mt-4 outline-none" aria-busy={carga === "cargando"}>
        <h2 className="text-fg text-base font-semibold tracking-tight">Código del proyecto</h2>
        {carga === "cargando" ? (
          <div className="space-y-2 animate-pulse motion-reduce:animate-none" aria-label="Cargando el repositorio">
            <div className="h-4 w-2/3 rounded bg-fill-2" />
            <div className="h-11 rounded-lg bg-fill" />
          </div>
        ) : (
          <div role="alert" className="space-y-2">
            <p className="text-danger text-sm">No se pudo leer el estado del repositorio.</p>
            <button
              type="button"
              onClick={() => {
                setCarga("cargando");
                void load();
              }}
              className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg text-sm font-semibold"
            >
              Volver a intentar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="conectar-repo" tabIndex={-1} className="bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-4 scroll-mt-4 outline-none">
      <div>
        <h2 className="text-fg text-base font-semibold tracking-tight">Código del proyecto</h2>
        <p className="text-fg-faint text-xs mt-0.5">
          {connected
            ? "Lo que la IA lee para analizar cada reunión sobre el sistema real."
            : "Conecta el repositorio y las reuniones dejarán de opinar a ciegas sobre el código."}
        </p>
      </div>

      {state && (!state.hasToken || (connected && !state.stats)) && (
        <div className="border border-warn/20 bg-warn/[0.04] rounded-xl p-3.5 space-y-2">
          <p className="text-warn text-xs leading-relaxed">
            {state.hasToken
              ? `Ninguna cuenta de GitHub guardada puede leer ${state.owner}/${state.repo}. Agrega un token de la cuenta ${state.owner} o de una que tenga acceso.`
              : "No hay token de GitHub guardado. Sin él solo se pueden leer repositorios públicos."}
          </p>
          <button
            onClick={() => setAsistente(true)}
            className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg hover:text-brand-hi text-xs font-semibold transition-colors"
          >
            Conectar cuenta de GitHub
          </button>
        </div>
      )}

      {connected && state?.stats ? (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-fg text-sm font-mono">
              {state.owner}/{state.repo}
            </span>
            <span className="text-fg-ghost text-xs">rama {state.branch}</span>
            {state.account && <span className="text-fg-ghost text-xs">· cuenta {state.account}</span>}
            {state.syncedAt && (
              <span className="text-fg-ghost text-xs">
                · leído {fechaCorta(state.syncedAt)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "archivos", value: state.stats.files },
              { label: "pantallas", value: state.stats.pages },
              { label: "endpoints", value: state.stats.apiRoutes },
              { label: "modelos", value: state.stats.dataModels },
            ].map((s) => (
              <div key={s.label} className="border border-line rounded-lg px-3 py-2">
                <p className="text-fg text-sm font-medium">{s.value}</p>
                <p className="text-fg-ghost text-[10px]">{s.label}</p>
              </div>
            ))}
          </div>

          {state.stats.docs.length > 0 && (
            <p className="text-fg-faint text-xs">
              Reglas del proyecto leídas de {state.stats.docs.join(", ")} — mandan sobre cualquier
              recomendación genérica.
            </p>
          )}
          {state.stats.lastCommit && (
            <p className="text-fg-ghost text-xs truncate">
              Último commit: {state.stats.lastCommit.message}
            </p>
          )}
          {state.stats.truncated && (
            <p className="text-warn text-xs">
              El repo es grande y el mapa quedó recortado; se priorizó el código sobre la
              configuración.
            </p>
          )}

          {/* En el celular, dos columnas iguales; desde tablet, botones compactos. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap pt-1">
            <button
              onClick={() => void connect()}
              disabled={busy !== null}
              className="min-h-11 sm:min-h-8 min-w-0 px-3 py-1.5 bg-fill hover:bg-fill-2 disabled:opacity-40 border border-line text-fg-mute text-xs rounded-lg transition-all"
            >
              {busy === "connect" ? "Leyendo…" : "↻ Volver a leer el código"}
            </button>
            <button
              onClick={() => void disconnect()}
              disabled={busy !== null}
              className="min-h-11 sm:min-h-8 min-w-0 px-3 py-1.5 bg-fill hover:bg-danger/10 disabled:opacity-40 border border-line hover:border-danger/25 text-fg-ghost hover:text-danger text-xs rounded-lg transition-all"
            >
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-[minmax(0,1fr)_8rem_auto]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="javidavo05/pimepanama o la URL de GitHub"
            className="col-span-2 xl:col-span-1 min-h-11 sm:min-h-8 min-w-0 bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
          />
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="rama (opcional)"
            className="min-w-0 min-h-11 sm:min-h-8 bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
          />
          <button
            onClick={() => void connect()}
            disabled={busy !== null || !input.trim()}
            className="min-h-11 sm:min-h-8 px-4 py-2 bg-brand hover:bg-brand-hi disabled:opacity-40 text-on-brand text-xs font-semibold rounded-lg transition-all"
          >
            {busy === "connect" ? "Leyendo…" : "Conectar"}
          </button>
        </div>
      )}

      {message && <p className="text-ok text-xs">{message}</p>}
      {error && <p className="text-danger text-xs">{error}</p>}
      <AsistenteTokenGithub
        abierto={asistente}
        onCerrar={() => setAsistente(false)}
        cuenta={state?.owner ?? null}
        repo={state?.owner && state?.repo ? `${state.owner}/${state.repo}` : null}
        onListo={async () => {
          if (state?.owner && state?.repo && !state.stats) await connect();
          else await load();
        }}
      />
    </div>
  );
}
