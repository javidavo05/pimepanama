"use client";

import { useActionState, useEffect, useState } from "react";
import { cambiarClaveAction, invitarCompaneroAction, quitarCompaneroAction } from "../acciones";
import { ActivarTotp } from "@/components/auth/totp";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { btnPeligro, btnPrincipal, btnSecundario } from "@/components/portal/ui";
import { IconEscudo } from "@/components/portal/iconos";
import { campo, errorBox, etiqueta, okBox } from "@/components/auth/auth-shell";
import { ClaveNueva } from "@/components/auth/campo-clave";

export function CambiarClave() {
  const [estado, accion, enviando] = useActionState(cambiarClaveAction, null);
  return (
    <form action={accion} className="space-y-4">
      <ClaveNueva etiquetaClave="Contraseña nueva" etiquetaRepetir="Repítela" />
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      {estado?.ok && <p className={okBox} role="status">{estado.mensaje}</p>}
      <button type="submit" className={btnPrincipal} disabled={enviando}>{enviando ? "Guardando…" : "Cambiar contraseña"}</button>
    </form>
  );
}

export function DobleVerificacion() {
  const [estado, setEstado] = useState<"cargando" | "activa" | "inactiva" | "activando">("cargando");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function leer() {
    const { data } = await createSupabaseBrowserClient().auth.mfa.listFactors();
    const f = data?.totp?.find((x) => x.status === "verified");
    setFactorId(f?.id ?? null); setEstado(f ? "activa" : "inactiva");
  }
  useEffect(() => { void leer(); }, []);
  async function desactivar() {
    if (!factorId) return;
    setError(null);
    const { error: e } = await createSupabaseBrowserClient().auth.mfa.unenroll({ factorId });
    if (e) { setError("Para desactivarla, sal y vuelve a entrar con tu código."); return; }
    await leer();
  }
  if (estado === "cargando") return <p className="text-fg-dim text-sm" role="status">Revisando…</p>;
  if (estado === "activando") return <ActivarTotp nombre="Pime" onListo={() => void leer()} />;
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-3 text-sm text-fg-mute leading-relaxed"><IconEscudo className="shrink-0 text-brand-fg" />
        {estado === "activa" ? "Está activa: al entrar te pedimos un código de tu teléfono además de la contraseña." : "Es opcional. Si la activas, para entrar hace falta tu contraseña y un código de una app en tu teléfono."}</p>
      {error && <p className={errorBox} role="alert">{error}</p>}
      {estado === "activa"
        ? <button type="button" className={btnPeligro} onClick={() => void desactivar()}>Desactivar</button>
        : <button type="button" className={btnPrincipal} onClick={() => setEstado("activando")}>Activar la doble verificación</button>}
    </div>
  );
}

export function InvitarCompanero() {
  const [estado, accion, enviando] = useActionState(invitarCompaneroAction, null);
  return (
    <form action={accion} className="space-y-4">
      <p className="text-fg text-sm font-semibold">Invitar a alguien de tu empresa</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="inv-nombre" className={etiqueta}>Nombre</label><input id="inv-nombre" name="nombre" autoComplete="off" className={campo} /></div>
        <div><label htmlFor="inv-email" className={etiqueta}>Correo</label><input id="inv-email" name="email" type="email" inputMode="email" required autoComplete="off" className={campo} /></div>
      </div>
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      {estado?.ok && <p className={okBox} role="status">{estado.mensaje}</p>}
      <button type="submit" className={btnSecundario} disabled={enviando}>{enviando ? "Enviando…" : "Enviar invitación"}</button>
    </form>
  );
}

export function QuitarCompanero({ id, nombre }: { id: string; nombre: string }) {
  const [estado, accion, enviando] = useActionState(quitarCompaneroAction, null);
  const [confirmar, setConfirmar] = useState(false);
  if (!confirmar) return <button type="button" className="text-xs font-semibold text-danger hover:underline min-h-11 px-2" onClick={() => setConfirmar(true)}>Quitar</button>;
  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="persona" value={id} />
      <button type="submit" className="text-xs font-semibold text-on-solid bg-danger-solid rounded-lg min-h-11 px-3" disabled={enviando} aria-label={`Confirmar: quitar el acceso de ${nombre}`}>Sí, quitar</button>
      <button type="button" className="text-xs font-semibold text-fg-dim min-h-11 px-2" onClick={() => setConfirmar(false)}>No</button>
      {estado?.error && <span className="sr-only" role="alert">{estado.error}</span>}
    </form>
  );
}
