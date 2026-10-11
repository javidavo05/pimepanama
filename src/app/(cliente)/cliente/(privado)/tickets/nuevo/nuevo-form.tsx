"use client";

import { useActionState, useState } from "react";
import { crearTicketAction } from "../../acciones";
import { SubirArchivos } from "@/components/portal/subir-archivos";
import { btnPrincipal } from "@/components/portal/ui";
import { campo, errorBox, etiqueta } from "@/components/auth/auth-shell";

const TIPOS = [
  { v: "soporte", t: "Algo no funciona", d: "Un error, algo que se ve mal o una duda." },
  { v: "cambio", t: "Cambiar algo existente", d: "Ajustar una pantalla, un reporte o un proceso." },
  { v: "nuevo", t: "Algo nuevo", d: "Un módulo, una integración o un sistema nuevo." },
] as const;

const AYUDA: Record<string, string> = {
  soporte: "Qué hiciste, qué esperabas que pasara y qué pasó. Si sale un mensaje de error, cópialo o agrega una captura.",
  cambio: "Qué quieres cambiar, dónde está hoy y cómo debería quedar.",
  nuevo: "Qué problema quieres resolver y quién lo va a usar.",
};

export function NuevoTicketForm({ proyectos, proyectoInicial, tipoInicial }: { proyectos: { id: string; name: string }[]; proyectoInicial: string; tipoInicial: string }) {
  const [estado, accion, enviando] = useActionState(crearTicketAction, null);
  const [tipo, setTipo] = useState(tipoInicial);
  return (
    <form action={accion} className="space-y-6">
      <fieldset>
        <legend className={etiqueta}>¿Qué necesitas?</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {TIPOS.map((x) => (
            <label key={x.v} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 min-h-14 transition-colors ${tipo === x.v ? "border-brand bg-brand/5" : "border-line-mid hover:border-line-loud"}`}>
              <input type="radio" name="tipo" value={x.v} checked={tipo === x.v} onChange={() => setTipo(x.v)} className="sr-only" />
              <span className="text-fg text-sm font-semibold">{x.t}</span>
              <span className="text-fg-dim text-xs leading-relaxed">{x.d}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {proyectos.length > 0 && (
        <div>
          <label htmlFor="proyecto" className={etiqueta}>Sistema o proyecto</label>
          <select id="proyecto" name="proyecto" defaultValue={proyectoInicial} className={`${campo} field-select pr-8`}>
            <option value="">No sé o es otro</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="titulo" className={etiqueta}>En una línea</label>
        <input id="titulo" name="titulo" required maxLength={160} className={campo} placeholder={tipo === "soporte" ? "El reporte de ventas no carga" : tipo === "cambio" ? "Agregar el filtro por vendedor" : "Portal para que los clientes paguen"} />
      </div>
      <div>
        <label htmlFor="detalle" className={etiqueta}>Detalle</label>
        <textarea id="detalle" name="detalle" required rows={6} maxLength={8000} className={`${campo} py-3 min-h-40`} aria-describedby="detalle-ayuda" />
        <p id="detalle-ayuda" className="mt-2 text-xs text-fg-faint">{AYUDA[tipo]}</p>
      </div>
      <SubirArchivos etiqueta="Adjuntar capturas" />
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fg-faint">El soporte se cobra a la tarifa por hora de tu cuenta. Las fallas nuestras dentro de la garantía no se cobran.</p>
        <button type="submit" className={btnPrincipal} disabled={enviando}>{enviando ? "Enviando…" : "Enviar el ticket a Pime"}</button>
      </div>
    </form>
  );
}
