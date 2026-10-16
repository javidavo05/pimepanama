"use client";

import { useActionState } from "react";
import { botonPrincipal, errorBox, okBox } from "@/components/auth/auth-shell";
import { confirmarBajaAction } from "./acciones";

export function BajaForm({ token, email }: { token: string; email: string }) {
  const [estado, accion, enviando] = useActionState(confirmarBajaAction, null);
  if (estado?.ok) {
    return (
      <p className={okBox} role="status">
        Listo: <strong className="[overflow-wrap:anywhere]">{email}</strong> ya no va a recibir nuestras campañas. Si te escribimos por un
        proyecto o una factura, esos correos siguen llegando.
      </p>
    );
  }
  return (
    <form action={accion} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-fg-soft text-sm leading-relaxed">
        Vas a dejar de recibir las campañas de Pime en <strong className="text-fg [overflow-wrap:anywhere]">{email}</strong>.
      </p>
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <button type="submit" className={botonPrincipal} disabled={enviando}>
        {enviando ? "Guardando tu baja…" : "Confirmar mi baja"}
      </button>
    </form>
  );
}
