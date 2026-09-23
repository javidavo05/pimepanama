"use client";

import { useEffect, useRef, useState } from "react";

interface PlatformConfidentialVaultProps {
  platformId: string;
  hasConfidential: boolean;
  onUpdated: (hasConfidential: boolean) => void;
}

type Mode = "locked" | "unlocked" | "setup";

export function PlatformConfidentialVault({
  platformId,
  hasConfidential: hasVault,
  onUpdated,
}: PlatformConfidentialVaultProps) {
  const [mode, setMode] = useState<Mode>(hasVault ? "locked" : "setup");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const sessionPasswordRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasVault) {
      setMode("setup");
      setContent("");
      sessionPasswordRef.current = null;
    } else if (mode === "setup") {
      setMode("locked");
    }
  }, [hasVault, mode]);

  async function saveWithPassword(pw: string): Promise<boolean> {
    if (!String(content).trim()) {
      setError("Escribe la información antes de guardar.");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/platforms/${platformId}/confidential`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "Contraseña incorrecta" ? "Contraseña incorrecta." : "No se pudo guardar.");
        return false;
      }
      onUpdated(true);
      return true;
    } catch {
      setError("Error de conexión.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock() {
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/platforms/${platformId}/confidential`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "Contraseña incorrecta" ? "Contraseña incorrecta." : "No se pudo desbloquear.");
        return;
      }
      setContent(typeof data.content === "string" ? data.content : "");
      sessionPasswordRef.current = password;
      setPassword("");
      setMode("unlocked");
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    const ok = await saveWithPassword(password);
    if (ok) {
      sessionPasswordRef.current = password;
      setPassword("");
      setMode("unlocked");
    }
  }

  async function handleSaveUnlocked() {
    const pw = sessionPasswordRef.current;
    if (!pw) {
      setError("Vuelve a desbloquear para guardar cambios.");
      return;
    }
    await saveWithPassword(pw);
  }

  async function handleRemove() {
    const pw = sessionPasswordRef.current ?? password;
    if (!pw) {
      setError("Ingresa la contraseña madre para eliminar.");
      return;
    }
    if (!window.confirm("¿Eliminar toda la información confidencial de esta plataforma?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/platforms/${platformId}/confidential`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo eliminar.");
        return;
      }
      onUpdated(false);
      setContent("");
      setPassword("");
      sessionPasswordRef.current = null;
      setMode("setup");
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  function lock() {
    setContent("");
    setPassword("");
    sessionPasswordRef.current = null;
    setError(null);
    setComposing(false);
    setMode(hasVault ? "locked" : "setup");
  }

  const inputCls =
    "w-full bg-panel border border-line-mid rounded-lg px-3 min-h-11 text-base sm:text-sm text-fg placeholder:text-fg-ghost focus:outline-none focus:border-brand/40";

  return (
    <section className="rounded-lg border border-line bg-panel p-4 space-y-3 self-start">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm text-fg font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-fg-faint" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Información confidencial
        </h3>
        {hasVault && (
          <span className="text-xs text-fg-faint">{mode === "unlocked" ? "Desbloqueada" : "Cifrada"}</span>
        )}
      </div>

      {mode === "setup" && !composing && (
        <div className="space-y-3">
          <p className="text-xs text-fg-faint leading-relaxed">
            Guarda aquí API keys, usuarios y contraseñas del proyecto. Se cifran con la contraseña madre de la suite.
          </p>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="px-4 min-h-11 border border-line-mid text-fg-soft hover:text-fg text-sm rounded-lg transition-colors"
          >
            Agregar información confidencial
          </button>
        </div>
      )}

      {mode === "setup" && composing && (
        <div className="space-y-2">
          <label htmlFor={`vault-new-${platformId}`} className="sr-only">Información confidencial</label>
          <textarea
            id={`vault-new-${platformId}`}
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="API keys, usuarios, contraseñas, notas del proyecto…"
            className={`${inputCls} py-2 resize-y`}
          />
          <label htmlFor={`vault-pw-${platformId}`} className="sr-only">Contraseña madre</label>
          <input
            id={`vault-pw-${platformId}`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña madre"
            className={inputCls}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !password}
              onClick={() => void handleCreate()}
              className="px-4 min-h-11 bg-fill-2 hover:bg-fill-3 border border-line-mid text-fg text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Cifrar y guardar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setComposing(false);
                setContent("");
                setPassword("");
                setError(null);
              }}
              className="px-4 min-h-11 text-fg-dim hover:text-fg text-sm rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mode === "locked" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleUnlock();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <label htmlFor={`vault-unlock-${platformId}`} className="sr-only">Contraseña madre</label>
          <input
            id={`vault-unlock-${platformId}`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña madre"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={busy || !password}
            className="shrink-0 px-4 min-h-11 bg-fill-2 hover:bg-fill-3 border border-line-mid text-fg text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {busy ? "Verificando…" : "Desbloquear"}
          </button>
        </form>
      )}

      {mode === "unlocked" && (
        <div className="space-y-2">
          <label htmlFor={`vault-edit-${platformId}`} className="sr-only">Información confidencial</label>
          <textarea
            id={`vault-edit-${platformId}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className={`${inputCls} py-2 resize-y`}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSaveUnlocked()}
              className="px-4 min-h-11 bg-fill-2 hover:bg-fill-3 border border-line-mid text-fg text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={lock}
              className="px-4 min-h-11 text-fg-dim hover:text-fg text-sm rounded-lg"
            >
              Bloquear
            </button>
            <button
              type="button"
              onClick={() => void handleRemove()}
              className="ml-auto px-4 min-h-11 text-danger hover:bg-danger/10 text-sm rounded-lg"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </section>
  );
}
