"use client";

/**
 * Configuración → Llave de OpenAI. Cada llave tiene un alias (pime, bb…) y vive en el servidor como
 * OPENAI_API_KEY_<ALIAS>; aquí solo se elige cuál usa toda la plataforma. Al tocar una, se prueba
 * con OpenAI y solo se cambia si responde.
 */
import { useState, useTransition } from "react";
import { cambiarLlaveOpenAIAction } from "@/app/(empresa)/empresa/(protected)/configuracion/acciones-llave-openai";

type Llave = { alias: string; final: string };

export function LlaveOpenAIConfig({ llaves, enUso }: { llaves: Llave[]; enUso: string | null }) {
  const [actual, setActual] = useState(enUso);
  const [probando, setProbando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function elegir(alias: string) {
    if (alias === actual || probando) return;
    setError(null);
    setProbando(alias);
    startTransition(async () => {
      const r = await cambiarLlaveOpenAIAction(alias).catch(() => ({ error: "No se pudo cambiar la llave. Intenta de nuevo." }));
      if ("error" in r) setError(r.error);
      else setActual(alias);
      setProbando(null);
    });
  }

  return (
    <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-fg text-sm font-semibold">Llave de OpenAI</h2>
        <p className="text-fg-dim text-xs mt-1">
          La que usan la voz, las reuniones y el asistente. Al elegir otra, Pime la prueba con OpenAI y solo cambia si responde.
        </p>
      </div>

      {llaves.length === 0 ? (
        <p className="text-sm text-fg-dim">
          No hay llaves con alias en el servidor. Agrégalas en Vercel como <code className="text-fg-mute">OPENAI_API_KEY_PIME</code>, <code className="text-fg-mute">OPENAI_API_KEY_BB</code>… y vuelve a desplegar.
        </p>
      ) : (
        <div role="radiogroup" aria-label="Llave de OpenAI en uso" className="grid gap-2 sm:grid-cols-2">
          {llaves.map((l) => {
            const activa = actual === l.alias;
            const esta = probando === l.alias;
            return (
              <button
                key={l.alias}
                type="button"
                role="radio"
                aria-checked={activa}
                aria-busy={esta}
                disabled={!!probando}
                onClick={() => elegir(l.alias)}
                className={`flex items-center justify-between gap-3 min-h-11 px-4 py-3 rounded-xl border text-left transition-colors disabled:cursor-wait ${
                  activa ? "border-brand bg-brand/10" : "border-line hover:border-line-mid"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-fg text-sm font-semibold truncate">{l.alias}</span>
                  <span className="block text-fg-dim text-xs">termina en {l.final}</span>
                </span>
                <span className={`shrink-0 text-xs font-semibold ${activa ? "text-brand-fg" : "text-fg-faint"}`}>
                  {esta ? "Probando…" : activa ? "En uso" : "Usar esta"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!actual && llaves.length > 0 && !error && (
        <p className="text-xs text-fg-dim">Ninguna elegida: se usa la llave general del servidor (OPENAI_API_KEY).</p>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}
