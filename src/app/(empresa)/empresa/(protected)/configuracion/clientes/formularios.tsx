"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { cambiarLineaAction, enviosClientesAction, guardarTarifasAction, type EstadoConfig } from "../../acciones-configuracion";
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
      <div className="grid gap-4 sm:grid-cols-2">
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

export function EnviosClientes({ encendidos }: { encendidos: boolean }) {
  const [estado, accion, enviando] = useActionState(enviosClientesAction, null);
  const [seguro, setSeguro] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-fg text-base font-semibold">Correos a clientes</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${encendidos ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`}>{encendidos ? "Encendidos" : "Apagados"}</span>
      </div>
      <p className="text-fg-dim text-sm">
        {encendidos
          ? "Pime escribe a los clientes: invitaciones a su cuenta, recordatorios de cobro, respuestas a tickets y órdenes de cambio."
          : "Pime no le escribe a ningún cliente. Invitaciones, recordatorios de cobro, respuestas a tickets y órdenes de cambio se guardan, pero no sale ningún correo."}
      </p>
      <form action={accion} className="space-y-3">
        <input type="hidden" name="encender" value={encendidos ? "0" : "1"} />
        {encendidos ? (
          <button className={btn.secondary} disabled={enviando}>{enviando ? "Apagando…" : "Apagar correos a clientes"}</button>
        ) : seguro ? (
          <div className="rounded-xl border border-warn/40 bg-warn/5 p-4 space-y-3">
            <p className="text-fg text-sm">Desde ahora, los clientes con cuenta reciben correos de Pime. ¿Encender?</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn.secondary} onClick={() => setSeguro(false)}>Dejar apagados</button>
              <button className={btn.primary} disabled={enviando}>{enviando ? "Encendiendo…" : "Encender correos a clientes"}</button>
            </div>
          </div>
        ) : (
          <button type="button" className={btn.secondary} onClick={() => setSeguro(true)}>Encender correos a clientes</button>
        )}
        <Mensajes e={estado} />
      </form>
    </div>
  );
}
