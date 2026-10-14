"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { cambiarLineaAction, guardarTarifasAction, type EstadoConfig } from "../../acciones-configuracion";
import { btn } from "@/components/empresa/page-header";

const errorBox = "rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger";
const okBox = "rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok";
function Mensajes({ e }: { e: EstadoConfig }) {
  if (e?.error) return <p className={errorBox} role="alert">{e.error}</p>;
  if (e?.ok && e.mensaje) return <p className={okBox} role="status">{e.mensaje}</p>;
  return null;
}

export function TarifasForm({ normal, premium }: { normal: number; premium: number }) {
  const [estado, accion, enviando] = useActionState(guardarTarifasAction, null);
  return (
    <form action={accion} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {[["normal", "Normal", normal, "Azul tinta"], ["premium", "Premium", premium, "Negro y oro"]].map(([k, t, v, d]) => (
          <label key={k as string} className="block rounded-xl border border-line-mid p-4">
            <span className="block text-fg text-sm font-semibold">{t as string} <span className="text-fg-dim font-normal">· {d as string}</span></span>
            <span className="mt-2 flex items-center gap-2">
              <span className="text-fg-dim text-sm">USD</span>
              <input name={k as string} inputMode="decimal" defaultValue={String(v)} required className="w-full min-h-11 rounded-lg border border-line-mid bg-fill px-3 text-base sm:text-sm text-fg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" aria-label={`Tarifa ${t} por hora`} />
              <span className="text-fg-dim text-sm whitespace-nowrap">/ hora</span>
            </span>
          </label>
        ))}
      </div>
      <Mensajes e={estado} />
      <div className="flex justify-end"><button className={btn.primary} disabled={enviando}>{enviando ? "Guardando…" : "Guardar tarifas"}</button></div>
    </form>
  );
}

export function LineaCliente({ clientId, linea }: { clientId: string; linea: "normal" | "premium" }) {
  const [actual, setOptimista] = useOptimistic(linea);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div role="radiogroup" aria-label="Línea del cliente" className={`inline-flex rounded-xl border border-line-mid p-1 ${pendiente ? "opacity-70" : ""}`}>
        {(["normal", "premium"] as const).map((l) => (
          <button key={l} type="button" role="radio" aria-checked={actual === l} disabled={pendiente}
            onClick={() => { if (l === actual) return; setError(null); iniciar(async () => { setOptimista(l); const r = await cambiarLineaAction(clientId, l); if (r?.error) setError(r.error); }); }}
            className={`min-h-11 sm:min-h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${actual === l ? (l === "premium" ? "bg-sand/15 text-sand-fg" : "bg-brand/10 text-brand-fg") : "text-fg-dim hover:text-fg"}`}>
            {l === "premium" ? "Premium" : "Normal"}
          </button>
        ))}
      </div>
      {error && <p className="text-danger text-xs" role="alert">{error}</p>}
    </div>
  );
}
