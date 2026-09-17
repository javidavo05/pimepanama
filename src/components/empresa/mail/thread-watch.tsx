"use client";

import { useState } from "react";
import Link from "next/link";
import { PushToggle } from "@/components/empresa/push-toggle";
import { formatEmailReceivedAt } from "@/lib/format-datetime";
import type { WatchStatus } from "@/lib/mail/watch";

/**
 * Estado de "conversación importante" compartido entre el botón del encabezado
 * y la tarjeta de seguimiento. Optimista: si el servidor falla, vuelve atrás y
 * deja el error a la vista.
 */
export function useThreadWatch(emailId: string, initial: WatchStatus) {
  const [watch, setWatch] = useState<WatchStatus>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const previous = watch;
    const next = !previous;
    setBusy(true);
    setError(null);
    if (!next) setWatch(null);
    try {
      const res = await fetch(`/api/empresa/mail/inbox/${emailId}/watch`, {
        method: next ? "POST" : "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar la conversación.");
      setWatch(data.watch ?? null);
    } catch (err) {
      setWatch(previous);
      setError(err instanceof Error ? err.message : "Error de red.");
    } finally {
      setBusy(false);
    }
  }

  return { watch, busy, error, toggle };
}

type WatchState = ReturnType<typeof useThreadWatch>;

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="w-4 h-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

export function WatchToggleButton({ state }: { state: WatchState }) {
  const active = !!state.watch;
  const label = active ? "Importante" : "Avisarme si responden";

  return (
    <button
      type="button"
      onClick={state.toggle}
      disabled={state.busy}
      aria-pressed={active}
      aria-label={active ? "Importante: dejar de avisar respuestas" : label}
      title={active ? "Dejar de avisar cuando respondan" : "Marcar como importante y avisar cuando respondan"}
      className={`min-h-11 sm:min-h-8 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber2/40 ${
        active
          ? "bg-amber2/10 border-amber2/25 text-amber2 hover:bg-amber2/15"
          : "bg-fill border-line text-fg-mute hover:text-fg-soft hover:bg-fill-2"
      }`}
    >
      <BellIcon filled={active} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * Tarjeta lateral: solo aparece con la conversación marcada. Responde lo que
 * uno se pregunta al abrir un hilo importante: ¿ya contestaron?
 */
export function WatchStatusCard({ state, currentEmailId }: { state: WatchState; currentEmailId: string }) {
  const { watch } = state;

  if (!watch) {
    return state.error ? (
      <p role="alert" className="text-danger-soft text-xs leading-relaxed px-4">{state.error}</p>
    ) : null;
  }

  const replies = watch.replyCount;
  const showLastReplyLink = watch.lastReplyEmailId && watch.lastReplyEmailId !== currentEmailId;

  return (
    <div className="bg-panel border border-amber2/20 rounded-xl overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-fg-dim text-[10px] uppercase tracking-widest">Seguimiento</p>
          <span className="text-amber2"><BellIcon filled /></span>
        </div>

        {replies === 0 ? (
          <div className="space-y-1">
            <p className="text-fg-soft text-sm font-medium">Esperando respuesta</p>
            <p className="text-fg-faint text-xs leading-relaxed">
              Marcada el {formatEmailReceivedAt(watch.createdAt)}. Cuando respondan te avisamos en la
              campana y en los dispositivos con avisos activos.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-fg-soft text-sm font-medium">
              {replies} respuesta{replies !== 1 ? "s" : ""} desde que la marcaste
            </p>
            {watch.lastReplyAt && (
              <p className="text-fg-faint text-xs leading-relaxed">
                Última: {formatEmailReceivedAt(watch.lastReplyAt)}
              </p>
            )}
            {showLastReplyLink && (
              <Link
                href={`/empresa/correos/hub/${watch.lastReplyEmailId}`}
                className="inline-block text-xs text-brand-fg hover:underline"
              >
                Ver última respuesta
              </Link>
            )}
          </div>
        )}

        {state.error && (
          <p role="alert" className="text-danger-soft text-xs leading-relaxed">{state.error}</p>
        )}

        <button
          type="button"
          onClick={state.toggle}
          disabled={state.busy}
          className="text-xs text-fg-faint hover:text-fg-mute disabled:opacity-50 transition-colors"
        >
          {state.busy ? "Quitando…" : "Dejar de seguir"}
        </button>
      </div>

      <div className="border-t border-line">
        <PushToggle />
      </div>
    </div>
  );
}
