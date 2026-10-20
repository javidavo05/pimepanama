"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/empresa/link";
import { dinero } from "@/lib/portal/dinero";
import { PAGO_METODO_LABEL } from "@/lib/portal/estados";
import type { FilaEntrada } from "@/lib/dinero/tablero";
import { fecharCobrosViejosAction } from "./acciones";

const campo = "min-h-11 w-full rounded-lg border border-line-mid bg-panel px-3 text-base sm:text-sm text-fg focus:border-brand focus:outline-none";

/**
 * Cobros de facturas viejas sin fecha de pago. Cada uno trae pre-rellenada la fecha de su factura (lo más probable)
 * y transferencia; se corrige lo que no coincida y se guardan todos juntos.
 */
export function CobrosSinFecha({ cobros }: { cobros: FilaEntrada[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [valores, setValores] = useState(() => Object.fromEntries(cobros.map((c) => [c.facturaId!, { fecha: c.fecha.slice(0, 10), metodo: "transferencia" }])));
  const [estado, setEstado] = useState<{ ok?: number; error?: string } | null>(null);
  const [enviando, iniciar] = useTransition();
  const hoy = new Date().toISOString().slice(0, 10);
  const total = cobros.reduce((a, c) => a + c.monto, 0);

  if (estado?.ok && !cobros.length) return null;
  const guardar = () => iniciar(async () => {
    const r = await fecharCobrosViejosAction(cobros.map((c) => ({ documentId: c.facturaId!, ...valores[c.facturaId!] })));
    setEstado("error" in r ? { error: r.error } : { ok: r.ok });
    if (!("error" in r)) router.refresh();
  });

  return (
    <section className="rounded-2xl border border-warn/40 bg-warn/5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg">{cobros.length} cobro(s) viejos sin fecha de pago · {dinero(total)}</h2>
          <p className="mt-1 text-sm leading-relaxed text-fg-dim">Se marcaron pagados antes del registro de pagos. Por ahora el mes a mes los cuenta en la fecha de su factura; ponles la fecha real en que entró el dinero.</p>
        </div>
        <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-line-mid px-4 text-sm font-semibold text-fg hover:border-line-loud">
          {abierto ? "Ocultar" : "Poner las fechas"}
        </button>
      </div>
      {abierto && (
        <div className="mt-4">
          <ul className="divide-y divide-line">
            {cobros.map((c) => {
              const v = valores[c.facturaId!];
              return (
                <li key={c.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_9rem] sm:items-center">
                  <span className="min-w-0 text-sm">
                    <Link href={`/empresa/facturas/${c.facturaId}`} className="inline-flex min-h-11 items-center font-medium text-fg hover:underline [overflow-wrap:anywhere] sm:min-h-0">{c.numero ?? "Factura"} · {c.cliente}</Link>
                    <span className="block text-xs text-fg-dim tabular-nums">{dinero(c.monto)} · factura del {new Date(c.fecha).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Panama" })}</span>
                  </span>
                  <label className="grid gap-1 text-xs text-fg-dim">
                    Entró el
                    <input type="date" max={hoy} value={v.fecha} onChange={(e) => setValores((x) => ({ ...x, [c.facturaId!]: { ...v, fecha: e.target.value } }))} className={campo} />
                  </label>
                  <label className="grid gap-1 text-xs text-fg-dim">
                    Método
                    <select value={v.metodo} onChange={(e) => setValores((x) => ({ ...x, [c.facturaId!]: { ...v, metodo: e.target.value } }))} className={campo}>
                      {Object.entries(PAGO_METODO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {estado?.error && <p role="alert" className="text-sm text-danger">{estado.error}</p>}
            <button type="button" onClick={guardar} disabled={enviando} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hi disabled:opacity-60">
              {enviando ? "Guardando…" : `Guardar ${cobros.length} fecha(s) de cobro`}
            </button>
          </div>
        </div>
      )}
      {estado?.ok ? <p role="status" className="mt-3 text-sm text-ok">Listo: {estado.ok} cobro(s) ya están en su mes.</p> : null}
    </section>
  );
}
