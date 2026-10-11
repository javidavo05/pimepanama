"use client";

import { useActionState } from "react";
import { nuevaClaveAction } from "../acciones";
import { botonPrincipal, campo, errorBox, etiqueta } from "@/components/auth/auth-shell";

export function NuevaClaveForm({ th }: { th: string }) {
  const [estado, accion, enviando] = useActionState(nuevaClaveAction, null);
  return (
    <form action={accion} className="space-y-5">
      <input type="hidden" name="th" value={th} />
      <div>
        <label htmlFor="clave" className={etiqueta}>Contraseña nueva</label>
        <input id="clave" name="clave" type="password" autoComplete="new-password" minLength={10} required className={campo} />
        <p className="mt-2 text-xs text-fg-faint">Al menos 10 caracteres.</p>
      </div>
      <div>
        <label htmlFor="repetir" className={etiqueta}>Repite la contraseña</label>
        <input id="repetir" name="repetir" type="password" autoComplete="new-password" minLength={10} required className={campo} />
      </div>
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <button type="submit" className={botonPrincipal} disabled={enviando}>{enviando ? "Guardando…" : "Guardar y entrar"}</button>
    </form>
  );
}
