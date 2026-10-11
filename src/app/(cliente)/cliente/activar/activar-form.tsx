"use client";

import { useActionState } from "react";
import { activarCuentaAction } from "../acciones";
import { botonPrincipal, campo, errorBox, etiqueta } from "@/components/auth/auth-shell";

export function ActivarForm({ token, nombre }: { token: string; nombre: string }) {
  const [estado, accion, enviando] = useActionState(activarCuentaAction, null);
  return (
    <form action={accion} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="nombre" className={etiqueta}>Tu nombre</label>
        <input id="nombre" name="nombre" autoComplete="name" required defaultValue={nombre} className={campo} />
      </div>
      <div>
        <label htmlFor="clave" className={etiqueta}>Contraseña</label>
        <input id="clave" name="clave" type="password" autoComplete="new-password" minLength={10} required className={campo} aria-describedby="clave-ayuda" />
        <p id="clave-ayuda" className="mt-2 text-xs text-fg-faint">Al menos 10 caracteres.</p>
      </div>
      <div>
        <label htmlFor="repetir" className={etiqueta}>Repite la contraseña</label>
        <input id="repetir" name="repetir" type="password" autoComplete="new-password" minLength={10} required className={campo} />
      </div>
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <button type="submit" className={botonPrincipal} disabled={enviando}>{enviando ? "Creando tu cuenta…" : "Crear contraseña y entrar"}</button>
    </form>
  );
}
