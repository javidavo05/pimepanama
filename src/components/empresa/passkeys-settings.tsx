"use client";

import { useCallback, useEffect, useState } from "react";
import { FingerprintIcon } from "@/components/empresa/fingerprint-icon";
import {
  biometricLabel,
  listPasskeys,
  passkeysSupported,
  registerPasskey,
  removePasskey,
  type PasskeySummary,
} from "@/lib/passkeys-client";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; passkeys: PasskeySummary[] };

const dateFmt = new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short", year: "numeric" });

/**
 * Dispositivos con los que se entra a la suite usando Touch ID, Face ID o la
 * huella. Activar aquí sirve para entrar; la bóveda de Platforms pide además
 * la contraseña madre una vez, desde la propia bóveda.
 */
export function PasskeysSettings() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [supported, setSupported] = useState(true);
  const [label, setLabel] = useState("huella");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    const list = await listPasskeys(force);
    setState(list ? { kind: "ready", passkeys: list } : { kind: "error" });
  }, []);

  useEffect(() => {
    setSupported(passkeysSupported());
    setLabel(biometricLabel());
    void refresh();
  }, [refresh]);

  async function handleAdd() {
    setBusy(true);
    setMessage(null);
    const result = await registerPasskey();
    setBusy(false);
    if (result.ok) {
      await refresh(true);
      setMessage(`Listo. Ya puedes entrar con ${label} en este dispositivo.`);
    } else if (result.error) {
      setMessage(result.error);
    }
  }

  async function handleRemove(p: PasskeySummary) {
    if (!window.confirm(`¿Quitar ${p.name}? Ese dispositivo tendrá que entrar con correo y contraseña.`)) return;
    setBusy(true);
    setMessage(null);
    const ok = await removePasskey(p.id);
    setBusy(false);
    if (!ok) setMessage("No se pudo quitar. Inténtalo de nuevo.");
    await refresh(true);
  }

  return (
    <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-fg text-sm font-semibold">Entrar con huella</h2>
        <p className="text-fg-dim text-xs mt-1">
          Touch ID en la Mac, Face ID o huella en el celular. La huella nunca sale de tu dispositivo.
        </p>
      </div>

      {state.kind === "loading" && <p className="text-fg-faint text-xs">Cargando dispositivos…</p>}

      {state.kind === "error" && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-danger text-xs">No se pudieron cargar los dispositivos.</p>
          <button
            type="button"
            onClick={() => {
              setState({ kind: "loading" });
              void refresh(true);
            }}
            className="px-3 min-h-11 text-fg-soft hover:text-fg text-sm rounded-lg"
          >
            Reintentar
          </button>
        </div>
      )}

      {state.kind === "ready" && state.passkeys.length === 0 && (
        <p className="text-fg-faint text-xs">
          Ningún dispositivo todavía. Actívalo aquí y la próxima vez entras sin escribir la contraseña.
        </p>
      )}

      {state.kind === "ready" && state.passkeys.length > 0 && (
        <ul className="divide-y divide-line border border-line rounded-lg">
          {state.passkeys.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2">
              <FingerprintIcon className="w-4 h-4 text-fg-faint shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-fg text-sm truncate">
                  {p.name}
                  {p.vaultAccess && <span className="text-fg-faint text-xs"> · abre la bóveda</span>}
                </p>
                <p className="text-fg-faint text-xs">
                  {p.lastUsedAt
                    ? `Usado el ${dateFmt.format(new Date(p.lastUsedAt))}`
                    : `Activado el ${dateFmt.format(new Date(p.createdAt))}`}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRemove(p)}
                className="shrink-0 px-3 min-h-11 text-fg-dim hover:text-danger text-sm rounded-lg disabled:opacity-50"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {supported ? (
        <button
          type="button"
          disabled={busy || state.kind === "loading"}
          onClick={() => void handleAdd()}
          className="inline-flex items-center gap-2 px-4 min-h-11 bg-fill-2 hover:bg-fill-3 border border-line-mid text-fg text-sm font-medium rounded-lg disabled:opacity-50"
        >
          <FingerprintIcon />
          {busy ? "Esperando la huella…" : `Activar ${label} en este dispositivo`}
        </button>
      ) : (
        <p className="text-fg-faint text-xs">Este navegador no admite huella ni Face ID.</p>
      )}

      {message && (
        <p role="status" className="text-fg-dim text-xs">
          {message}
        </p>
      )}
    </section>
  );
}
