"use client";

import { useActionState } from "react";
import { recuperarAction } from "../acciones";
import { botonPrincipal, campo, etiqueta, okBox } from "@/components/auth/auth-shell";

export function RecuperarForm() {
  const [estado, accion, enviando] = useActionState(recuperarAction, null);
  if (estado?.ok) {
    return <p className={okBox} role="status">Si ese correo tiene una cuenta en Pime, te llegó un enlace. Revisa también la carpeta de correo no deseado. El enlace vence en una hora.</p>;
  }
  return (
    <form action={accion} className="space-y-5">
      <div>
        <label htmlFor="email" className={etiqueta}>Correo</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className={campo} />
      </div>
      <button type="submit" className={botonPrincipal} disabled={enviando}>{enviando ? "Enviando…" : "Enviarme el enlace"}</button>
    </form>
  );
}
