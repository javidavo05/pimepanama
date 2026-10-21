"use client";

import { useActionState } from "react";
import { botonPrincipal, errorBox, okBox } from "@/components/auth/auth-shell";
import { confirmarBajaAction } from "./acciones";
import { TEXTOS, type Idioma } from "./textos";

export function BajaForm({ token, email, idioma }: { token: string; email: string; idioma: Idioma }) {
  const [estado, accion, enviando] = useActionState(confirmarBajaAction, null);
  const t = TEXTOS[idioma];
  if (estado?.ok) {
    return (
      <p className={okBox} role="status">
        {t.listo[0]}<strong className="[overflow-wrap:anywhere]">{email}</strong>{t.listo[1]}
      </p>
    );
  }
  return (
    <form action={accion} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="idioma" value={idioma} />
      <p className="text-fg-soft text-sm leading-relaxed">
        {t.vas} <strong className="text-fg [overflow-wrap:anywhere]">{email}</strong>.
      </p>
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <button type="submit" className={botonPrincipal} disabled={enviando}>
        {enviando ? t.guardando : t.confirmar}
      </button>
    </form>
  );
}
