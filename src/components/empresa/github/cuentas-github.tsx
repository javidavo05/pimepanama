"use client";

/** Cuentas de GitHub conectadas, en Configuración. Agregar una abre el asistente de 3 pasos. */
import { useCallback, useEffect, useState } from "react";
import { AsistenteTokenGithub } from "./asistente-token";

type Cuenta = { login: string; source: string; error: string | null; projects: number };

export function CuentasGithub() {
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null);
  const [error, setError] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/empresa/github", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setCuentas(((await r.json()).accounts ?? []) as Cuenta[]);
      setError(false);
    } catch { setError(true); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  async function quitar(login: string) {
    setQuitando(login);
    try { await fetch(`/api/empresa/github?login=${encodeURIComponent(login)}`, { method: "DELETE" }); await cargar(); } finally { setQuitando(null); }
  }

  return (
    <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-fg text-sm font-semibold">Cuentas de GitHub</h2>
          <p className="text-fg-dim text-xs mt-1">Con ellas Pime lee el avance real de cada proyecto. Solo lectura.</p>
        </div>
        <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center min-h-11 px-4 rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg">Conectar cuenta</button>
      </div>
      {error ? (
        <p className="text-sm text-danger">No se pudieron cargar las cuentas. <button type="button" onClick={() => void cargar()} className="underline font-semibold">Reintentar</button></p>
      ) : cuentas === null ? (
        <p className="text-sm text-fg-dim" aria-busy>Cargando cuentas…</p>
      ) : cuentas.length === 0 ? (
        <p className="text-sm text-fg-dim">Ninguna cuenta todavía. Conecta la cuenta donde vive el código de tus proyectos.</p>
      ) : (
        <ul className="divide-y divide-line">
          {cuentas.map((c) => (
            <li key={c.login} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-fg text-sm font-semibold truncate">{c.login}</p>
                <p className="text-fg-dim text-xs">{c.projects ? `${c.projects} ${c.projects === 1 ? "proyecto" : "proyectos"}` : "Sin proyectos todavía"}{c.source === "gh-cli" ? " · traída de Git PIME" : ""}{c.error ? ` · ${c.error}` : ""}</p>
              </div>
              <button type="button" disabled={quitando === c.login} onClick={() => void quitar(c.login)} className="inline-flex items-center min-h-11 sm:min-h-8 px-3 rounded-lg text-xs font-semibold text-fg-dim hover:text-danger">{quitando === c.login ? "Quitando…" : "Quitar"}</button>
            </li>
          ))}
        </ul>
      )}
      <AsistenteTokenGithub abierto={abierto} onCerrar={() => setAbierto(false)} onListo={() => cargar()} />
    </section>
  );
}
