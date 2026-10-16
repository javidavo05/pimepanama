"use client";

/** Botón de una acción que no se deshace (borrar): el primer toque pide confirmar en el mismo lugar. */
import { useState } from "react";
import { useFormStatus } from "react-dom";

const base = "inline-flex items-center justify-center min-h-11 px-3 rounded-lg text-sm font-semibold whitespace-nowrap";

function Confirmar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`${base} bg-danger/10 border border-danger/30 text-danger disabled:opacity-50`}>{pending ? "Borrando…" : texto}</button>;
}

export function ConfirmarBoton({ accion, id, etiqueta, confirmar }: { accion: (f: FormData) => Promise<void>; id: string; etiqueta: string; confirmar: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return <button type="button" onClick={() => setAbierto(true)} className={`${base} text-fg-dim hover:text-danger`}>{etiqueta}</button>;
  }
  return (
    <form action={accion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Confirmar texto={confirmar} />
      <button type="button" onClick={() => setAbierto(false)} className={`${base} text-fg-dim hover:text-fg`}>No</button>
    </form>
  );
}
