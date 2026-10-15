"use client";

import { useActionState } from "react";
import { nuevaClaveAction } from "../acciones";
import { botonPrincipal, errorBox } from "@/components/auth/auth-shell";
import { ClaveNueva } from "@/components/auth/campo-clave";

export function NuevaClaveForm({ th }: { th: string }) {
  const [estado, accion, enviando] = useActionState(nuevaClaveAction, null);
  return (
    <form action={accion} className="space-y-5">
      <input type="hidden" name="th" value={th} />
      <ClaveNueva etiquetaClave="Contraseña nueva" />
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <button type="submit" className={botonPrincipal} disabled={enviando} aria-busy={enviando}>{enviando ? "Guardando…" : "Guardar y entrar"}</button>
    </form>
  );
}
