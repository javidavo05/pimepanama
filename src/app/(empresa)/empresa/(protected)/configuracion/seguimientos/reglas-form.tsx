"use client";

import { useActionState, useState } from "react";
import { btn } from "@/components/empresa/page-header";
import { campo } from "@/components/empresa/clientes/formularios";
import type { ReglasCrm } from "@/lib/crm/seguimientos-reglas";
import { guardarReglasAction } from "./acciones";

const errorBox = "rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger";
const okBox = "rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok";

const REGLAS: { clave: keyof ReglasCrm; titulo: string; antes: string; despues: string; leyenda: string }[] = [
  {
    clave: "leadSinRespuesta",
    titulo: "Lead sin respuesta",
    antes: "Si un lead nuevo o contactado lleva",
    despues: "días sin movimiento, crear «Volver a escribir a…».",
    leyenda: "Cuenta como movimiento una interacción anotada, un cambio en el lead o una tarea suya completada.",
  },
  {
    clave: "clienteSinContacto",
    titulo: "Cliente sin contacto",
    antes: "Si un cliente lleva",
    despues: "días sin contacto, crear «Contactar a…» para su responsable.",
    leyenda: "Usa el último contacto anotado, la última interacción o lo último que pasó en su línea de tiempo.",
  },
  {
    clave: "renovacion",
    titulo: "Contrato por vencer",
    antes: "Cuando a un contrato activo le falten",
    despues: "días o menos para vencer, crear «Renovar contrato…».",
    leyenda: "Se crea una sola vez por fecha de vencimiento, con entrega el día que vence.",
  },
];

export function ReglasForm({ reglas }: { reglas: ReglasCrm }) {
  const [estado, accion, enviando] = useActionState(guardarReglasAction, null);
  const [activas, setActivas] = useState(() => Object.fromEntries(REGLAS.map((r) => [r.clave, reglas[r.clave].activa])) as Record<keyof ReglasCrm, boolean>);

  return (
    <form action={accion} className="space-y-4">
      {REGLAS.map((r) => {
        const on = activas[r.clave];
        return (
          <section key={r.clave} className="bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0">
            <label className="flex items-start justify-between gap-4 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-fg text-base font-semibold">{r.titulo}</span>
                <span className="block text-fg-dim text-sm mt-1">{on ? "Encendida" : "Apagada: no crea tareas"}</span>
              </span>
              <span className="relative inline-flex items-center min-h-11 shrink-0">
                <input
                  type="checkbox"
                  name={`${r.clave}Activa`}
                  checked={on}
                  onChange={(e) => setActivas((a) => ({ ...a, [r.clave]: e.target.checked }))}
                  className="peer sr-only"
                />
                <span aria-hidden className="w-12 h-7 rounded-full bg-fill-2 border border-line-mid peer-checked:bg-brand peer-checked:border-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 transition-colors" />
                <span aria-hidden className="absolute left-1 w-5 h-5 rounded-full bg-panel shadow transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
            <div className={`mt-4 flex flex-wrap items-center gap-2 text-sm text-fg-soft ${on ? "" : "opacity-50"}`}>
              <span>{r.antes}</span>
              <input
                name={`${r.clave}Dias`}
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                defaultValue={reglas[r.clave].dias}
                disabled={!on}
                aria-label={`Días para ${r.titulo.toLowerCase()}`}
                className={`${campo} !w-24 text-center`}
              />
              <span className="min-w-0 [overflow-wrap:anywhere]">{r.despues}</span>
            </div>
            <p className="text-fg-dim text-xs mt-3">{r.leyenda}</p>
          </section>
        );
      })}
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      {estado?.ok && estado.mensaje && <p className={okBox} role="status">{estado.mensaje}</p>}
      <div className="flex justify-end">
        <button className={btn.primary} disabled={enviando}>{enviando ? "Guardando…" : "Guardar reglas"}</button>
      </div>
    </form>
  );
}
