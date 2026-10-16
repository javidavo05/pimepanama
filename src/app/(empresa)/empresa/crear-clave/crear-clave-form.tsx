"use client";

import { useActionState } from "react";
import { crearClaveEquipoAction } from "./acciones";
import { botonPrincipal, errorBox } from "@/components/auth/auth-shell";
import { ClaveNueva } from "@/components/auth/campo-clave";

export function CrearClaveForm({ th, t }: { th: string; t: string }) {
  const [estado, accion, enviando] = useActionState(crearClaveEquipoAction, null);
  return (
    <form action={accion} className="space-y-5">
      <input type="hidden" name="th" value={th} />
      <input type="hidden" name="t" value={t} />
      <ClaveNueva etiquetaClave="Tu contraseña" />
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <button type="submit" className={botonPrincipal} disabled={enviando} aria-busy={enviando}>{enviando ? "Guardando…" : "Crear contraseña y entrar"}</button>
    </form>
  );
}
