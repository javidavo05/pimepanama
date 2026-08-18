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
    setMode(hasVault ? "locked" : "setup");
  }

  return (
    <div className="border border-amber-500/20 bg-amber-500/[0.04] rounded-lg p-3 space-y-2.5 mt-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-amber-400/90 font-medium flex items-center gap-1.5">
          <span aria-hidden>🔒</span>
          Información confidencial
        </p>
        {hasVault && mode === "locked" && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300/80 border border-amber-500/20">
            Cifrado
          </span>
        )}
      </div>

      <p className="text-[10px] text-white/40 leading-relaxed">
        Credenciales y notas sensibles del proyecto. Protegido con la contraseña madre de la suite.
      </p>

      {mode === "setup" && (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="API keys, usuarios, contraseñas, notas del proyecto..."
            className="w-full bg-[#07070e] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 resize-y min-h-[80px]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña madre"
            className="w-full bg-[#07070e] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30"
          />
          <button
            type="button"
            disabled={busy || !password}
            onClick={() => void handleCreate()}
            className="w-full px-3 py-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 rounded-lg disabled:opacity-50"
          >
            {busy ? "Guardando..." : "Guardar información cifrada"}
          </button>
        </div>
      )}

      {mode === "locked" && (
        <div className="space-y-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleUnlock()}
            placeholder="Contraseña madre"
            className="w-full bg-[#07070e] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30"
          />
          <button
            type="button"
            disabled={busy || !password}
            onClick={() => void handleUnlock()}
            className="w-full px-3 py-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.1] text-white/80 rounded-lg disabled:opacity-50"
          >
            {busy ? "Verificando..." : "Desbloquear"}
          </button>
        </div>
      )}

      {mode === "unlocked" && (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full bg-[#07070e] border border-amber-500/20 rounded px-2 py-1.5 text-xs text-white resize-y min-h-[100px]"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSaveUnlocked()}
              className="px-2.5 py-1 text-[11px] bg-green-600/60 hover:bg-green-600/80 text-white rounded-md disabled:opacity-50"
            >
              {busy ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={lock}
              className="px-2.5 py-1 text-[11px] border border-white/[0.1] text-white/60 rounded-md"
            >
              Bloquear
            </button>
            <button
              type="button"
              onClick={() => void handleRemove()}
              className="px-2.5 py-1 text-[11px] text-red-400/80 rounded-md ml-auto"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
