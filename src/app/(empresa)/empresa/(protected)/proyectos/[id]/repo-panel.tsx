"use client";

import { useCallback, useEffect, useState } from "react";

interface RepoState {
  owner: string | null;
  repo: string | null;
  branch: string | null;
  syncedAt: string | null;
  hasToken: boolean;
  summary: string | null;
  stats: {
    files: number;
    pages: number;
    apiRoutes: number;
    dataModels: number;
    dependencies: number;
    docs: string[];
    lastCommit: { sha: string; message: string; date: string } | null;
    truncated: boolean;
  } | null;
}

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
export function RepoPanel({ projectId }: { projectId: string }) {
  const [state, setState] = useState<RepoState | null>(null);
  const [input, setInput] = useState("");
  const [branch, setBranch] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/empresa/projects/${projectId}/repo`);
      if (!res.ok) return;
      setState(await res.json());
    } catch {
      // Un panel que no carga no debe romper el detalle del proyecto.
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveToken() {
    setBusy("token");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/empresa/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el token");
      setToken("");
      setShowToken(false);
      setMessage(`Token guardado${data.login ? ` — conectado como ${data.login}` : ""}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el token");
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    setBusy("connect");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/empresa/projects/${projectId}/repo`, {
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
      await fetch(`/api/empresa/projects/${projectId}/repo`, { method: "DELETE" });
      setMessage("Repositorio desconectado.");
      await load();
    } finally {
      setBusy(null);
    }
  }

  const connected = Boolean(state?.owner && state?.repo);

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="text-fg font-medium">Código del proyecto</h2>
        <p className="text-fg-faint text-xs mt-0.5">
          {connected
            ? "Lo que la IA lee para analizar cada reunión sobre el sistema real."
            : "Conecta el repositorio y las reuniones dejarán de opinar a ciegas sobre el código."}
        </p>
      </div>

      {state && !state.hasToken && (
        <div className="border border-warn/20 bg-warn/[0.04] rounded-xl p-3.5 space-y-2">
          <p className="text-warn text-xs leading-relaxed">
            No hay token de GitHub guardado. Sin él solo se pueden leer repositorios públicos.
          </p>
          {showToken ? (
            <div className="flex gap-2 flex-wrap">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_… (token con lectura de repositorios)"
                className="flex-1 min-w-[220px] bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
              />
              <button
                onClick={() => void saveToken()}
                disabled={busy !== null || !token.trim()}
                className="px-4 py-2 bg-brand hover:bg-brand-hi disabled:opacity-40 text-on-brand text-xs font-semibold rounded-lg transition-all"
              >
                {busy === "token" ? "Comprobando…" : "Guardar token"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowToken(true)}
              className="text-brand-fg hover:text-brand-hi text-xs transition-colors"
            >
              + Añadir token de GitHub
            </button>
          )}
        </div>
      )}

      {connected && state?.stats ? (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-fg text-sm font-mono">
              {state.owner}/{state.repo}
            </span>
            <span className="text-fg-ghost text-xs">rama {state.branch}</span>
            {state.syncedAt && (
              <span className="text-fg-ghost text-xs">
                · leído {new Date(state.syncedAt).toLocaleDateString("es-PA")}
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

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => void connect()}
              disabled={busy !== null}
              className="px-3 py-1.5 bg-fill hover:bg-fill-2 disabled:opacity-40 border border-line text-fg-mute text-xs rounded-lg transition-all"
            >
              {busy === "connect" ? "Leyendo…" : "↻ Volver a leer el código"}
            </button>
            <button
              onClick={() => void disconnect()}
              disabled={busy !== null}
              className="px-3 py-1.5 bg-fill hover:bg-danger/10 disabled:opacity-40 border border-line hover:border-danger/25 text-fg-ghost hover:text-danger text-xs rounded-lg transition-all"
            >
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="javidavo05/pimepanama o la URL de GitHub"
            className="flex-1 min-w-[220px] bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
          />
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="rama (opcional)"
            className="w-32 bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
          />
          <button
            onClick={() => void connect()}
            disabled={busy !== null || !input.trim()}
            className="px-4 py-2 bg-brand hover:bg-brand-hi disabled:opacity-40 text-on-brand text-xs font-semibold rounded-lg transition-all"
          >
            {busy === "connect" ? "Leyendo…" : "Conectar"}
          </button>
        </div>
      )}

      {message && <p className="text-ok text-xs">{message}</p>}
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
