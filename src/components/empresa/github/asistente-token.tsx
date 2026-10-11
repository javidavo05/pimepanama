"use client";

/**
 * Asistente para conectar una cuenta de GitHub con un token, en 3 pasos:
 *   1. Abrir GitHub con la página del token ya llenada (permiso de lectura de repos).
 *   2. Pegar el token: Pime lo comprueba al instante y dice de qué cuenta es.
 *   3. Listo: si venía de un proyecto, lee su repositorio.
 */
import { useState } from "react";
import { Asistente, btnAsistente } from "@/components/empresa/asistente/asistente";

const PASOS = ["Crear el token", "Pegarlo", "Listo"];

function enlaceGithub(cuenta?: string | null) {
  const desc = encodeURIComponent(`Pime Suite${cuenta ? ` · ${cuenta}` : ""}`);
  return `https://github.com/settings/tokens/new?scopes=repo&description=${desc}`;
}

export function AsistenteTokenGithub({ abierto, onCerrar, cuenta, repo, onListo }: {
  abierto: boolean;
  onCerrar: () => void;
  /** Cuenta dueña del repo, si se sabe: se le dice a la persona con cuál entrar. */
  cuenta?: string | null;
  repo?: string | null;
  /** Se llama con el login guardado. */
  onListo?: (login: string) => void | Promise<void>;
}) {
  const [paso, setPaso] = useState(1);
  const [token, setToken] = useState("");
  const [estado, setEstado] = useState<{ cargando?: boolean; error?: string; login?: string }>({});

  function cerrar() {
    setPaso(1); setToken(""); setEstado({});
    onCerrar();
  }

  async function guardar(valor = token) {
    const t = valor.trim();
    if (!t) return;
    setEstado({ cargando: true });
    try {
      const r = await fetch("/api/empresa/github", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: t }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "GitHub no aceptó ese token.");
      setEstado({ login: j.login });
      setPaso(3);
      await onListo?.(j.login);
    } catch (e) {
      setEstado({ error: e instanceof Error ? e.message : "No se pudo comprobar el token." });
    }
  }

  const pie =
    paso === 1 ? (
      <>
        <button type="button" className={btnAsistente.secundario} onClick={() => setPaso(2)}>Ya tengo el token</button>
        <a href={enlaceGithub(cuenta)} target="_blank" rel="noreferrer" className={btnAsistente.principal} onClick={() => setPaso(2)}>Abrir GitHub</a>
      </>
    ) : paso === 2 ? (
      <>
        <button type="button" className={btnAsistente.secundario} onClick={() => setPaso(1)}>Atrás</button>
        <button type="button" className={btnAsistente.principal} disabled={!token.trim() || estado.cargando} onClick={() => void guardar()}>{estado.cargando ? "Comprobando con GitHub…" : "Conectar cuenta"}</button>
      </>
    ) : (
      <button type="button" className={btnAsistente.principal} onClick={cerrar}>Terminar</button>
    );

  return (
    <Asistente abierto={abierto} onCerrar={cerrar} titulo={paso === 3 ? "Cuenta conectada" : "Conectar una cuenta de GitHub"} paso={paso} pasos={PASOS} pie={pie}>
      {paso === 1 && (
        <div className="space-y-6">
          <p className="text-fg-mute text-sm leading-relaxed">
            Pime necesita un token para leer {repo ? <b className="text-fg">{repo}</b> : "los repositorios"} y mover solo la barra de avance del cliente. Solo lee: nunca cambia el código.
          </p>
          {cuenta && (
            <div className="rounded-xl bg-fill px-4 py-3 text-sm">
              <p className="text-fg-dim">Entra a GitHub con la cuenta</p>
              <p className="text-fg font-semibold [overflow-wrap:anywhere]">{cuenta}</p>
            </div>
          )}
          <ol className="space-y-4 text-sm">
            {[
              ["Toca «Abrir GitHub».", "Se abre la página del token ya llenada, con el permiso de lectura marcado."],
              ["Elige cuándo vence.", "Un año está bien. Cuando venza, repites este asistente."],
              ["Baja al final y toca «Generate token».", "Copia el código que empieza con ghp_ y vuelve aquí."],
            ].map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-brand-fg text-xs font-bold">{i + 1}</span>
                <span><span className="block text-fg font-semibold">{t}</span><span className="block text-fg-dim">{d}</span></span>
              </li>
            ))}
          </ol>
          <p className="text-fg-dim text-xs">Si GitHub abre con otra cuenta, cámbiala desde tu foto, arriba a la derecha.</p>
        </div>
      )}
      {paso === 2 && (
        <div className="space-y-4">
          <label htmlFor="gh-token" className="block text-fg text-sm font-semibold">Pega el token</label>
          <input
            id="gh-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => { setToken(e.target.value); setEstado({}); }}
            onPaste={(e) => { const v = e.clipboardData.getData("text"); if (/^(ghp_|github_pat_)/.test(v.trim())) { e.preventDefault(); setToken(v.trim()); void guardar(v); } }}
            placeholder="ghp_…"
            className="w-full min-h-12 rounded-xl border border-line-mid bg-fill px-4 font-mono text-base text-fg placeholder:text-fg-trace focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <p className="text-fg-dim text-xs">Al pegarlo, Pime lo comprueba con GitHub y lo guarda cifrado. Nadie lo vuelve a ver.</p>
          {estado.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
        </div>
      )}
      {paso === 3 && (
        <div className="space-y-4 text-center py-4">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok/10 text-ok" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          <p className="text-fg text-base font-semibold">Conectado como {estado.login}</p>
          <p className="text-fg-dim text-sm">{repo ? `Pime ya está leyendo ${repo}.` : "Los proyectos de esta cuenta ya se pueden ligar a su repositorio."}</p>
          {cuenta && estado.login && estado.login.toLowerCase() !== cuenta.toLowerCase() && (
            <p className="text-warn text-sm">Ese token es de {estado.login}, no de {cuenta}. Si no puede leer el repositorio, repite el asistente con la cuenta {cuenta}.</p>
          )}
        </div>
      )}
    </Asistente>
  );
}
