"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Device {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

const dateFmt = new Intl.DateTimeFormat("es-PA", {
  dateStyle: "medium",
  timeStyle: "short",
  // Igual en servidor y navegador: sin esto la hidratación no coincide.
  timeZone: "America/Panama",
});

/**
 * Vincular = pedir una llave y pasársela a la app por el enlace pimeguard://.
 * La llave no se muestra ni se guarda en el navegador.
 */
export function MacDevices({ devices, autoConnect }: { devices: Device[]; autoConnect: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function connect() {
    setBusy("connect");
    setError(null);
    try {
      const res = await fetch("/api/empresa/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Mac · PIME Guard" }),
      });
      if (!res.ok) throw new Error();
      const { token } = (await res.json()) as { token: string };
      window.location.href = `pimeguard://connect?token=${encodeURIComponent(token)}`;
      setSent(true);
      router.refresh();
    } catch {
      setError("No se pudo crear la llave. Revisa la conexión y vuelve a intentar.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/devices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("No se pudo desvincular. Vuelve a intentar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-fg text-sm font-semibold">Vincular esta Mac</h2>
          <p className="text-fg-dim text-xs mt-1 leading-relaxed">
            {autoConnect
              ? "Llegaste desde PIME Guard. Al vincular, el navegador te pide abrir la app: acéptalo."
              : "Necesitas PIME Guard instalado en esta Mac. Al vincular, el navegador te pide abrir la app: acéptalo."}
          </p>
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={busy !== null}
          className="w-full sm:w-auto px-6 py-3 bg-brand hover:bg-brand-hi disabled:opacity-50 text-on-brand text-sm font-semibold rounded-lg transition-colors"
        >
          {busy === "connect" ? "Creando la llave…" : "Vincular PIME Guard con mi cuenta"}
        </button>
        {sent && (
          <p className="text-ok text-xs leading-relaxed" role="status">
            Llave enviada a PIME Guard. Abre el panel de la barra de menú: la pestaña Correos ya
            debería mostrar tu bandeja.
          </p>
        )}
        {error && (
          <p className="text-danger text-xs" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="bg-panel border border-line rounded-2xl p-6">
        <h2 className="text-fg text-sm font-semibold">Macs vinculadas</h2>
        {devices.length === 0 ? (
          <p className="text-fg-dim text-xs mt-2 leading-relaxed">
            Ninguna todavía. Cuando vincules PIME Guard aparece aquí, con la última vez que
            consultó; desde aquí la desvinculas si pierdes la Mac.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-fg text-sm truncate">{d.name}</p>
                  <p className="text-fg-faint text-xs mt-1">
                    Vinculada {dateFmt.format(new Date(d.createdAt))}
                    {" · "}
                    {d.lastUsedAt
                      ? `última consulta ${dateFmt.format(new Date(d.lastUsedAt))}`
                      : "todavía no consulta"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(d.id)}
                  disabled={busy !== null}
                  className="shrink-0 min-h-[44px] px-4 rounded-lg text-xs font-semibold bg-fill-2 text-fg-dim hover:bg-fill-3 hover:text-fg-soft disabled:opacity-50 transition-colors"
                >
                  {busy === d.id ? "Desvinculando…" : "Desvincular"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
