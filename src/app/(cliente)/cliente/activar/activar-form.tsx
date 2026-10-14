"use client";

import { useActionState } from "react";
import { activarCuentaAction } from "../acciones";
import { botonPrincipal, campo, errorBox, etiqueta } from "@/components/auth/auth-shell";
import { ClaveNueva } from "@/components/auth/campo-clave";

export function ActivarForm({ token, nombre }: { token: string; nombre: string }) {
  const [estado, accion, enviando] = useActionState(activarCuentaAction, null);
  return (
    <form action={accion} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="nombre" className={etiqueta}>Tu nombre</label>
        <input id="nombre" name="nombre" autoComplete="name" required defaultValue={nombre} className={campo} />
      </div>
      <ClaveNueva />
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <button type="submit" className={botonPrincipal} disabled={enviando}>{enviando ? "Creando tu cuenta…" : "Crear contraseña y entrar"}</button>
    </form>
  );
}
