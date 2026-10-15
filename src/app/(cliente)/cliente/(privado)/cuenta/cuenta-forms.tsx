"use client";

import { useActionState, useEffect, useState } from "react";
import { cambiarClaveAction, cambiarRolAction, guardarLogoAction, invitarCompaneroAction, quitarCompaneroAction, quitarLogoAction } from "../acciones";
import { ActivarTotp } from "@/components/auth/totp";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { btnPeligro, btnPrincipal, btnSecundario } from "@/components/portal/ui";
import { IconCuenta, IconEscudo } from "@/components/portal/iconos";
import { Opciones } from "@/components/portal/opciones";
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
      <fieldset>
        <legend className={etiqueta}>Qué puede hacer</legend>
        <Opciones name="rol" porDefecto="miembro" opciones={[
          { v: "miembro", t: "Miembro", d: "Ve proyectos, tickets, facturas y los accesos del sistema.", Icon: IconCuenta },
          { v: "principal", t: "Dueño", d: "Además invita personas, quita accesos y da permisos.", Icon: IconEscudo },
        ]} />
      </fieldset>
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

export function CambiarRol({ id, rol, nombre }: { id: string; rol: string; nombre: string }) {
  const [estado, accion, enviando] = useActionState(cambiarRolAction, null);
  const nuevo = rol === "principal" ? "miembro" : "principal";
  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="persona" value={id} /><input type="hidden" name="rol" value={nuevo} />
      <button type="submit" className="text-xs font-semibold text-brand-fg hover:underline min-h-11 px-2" disabled={enviando} aria-label={`${nuevo === "principal" ? "Hacer dueño" : "Volver miembro"} a ${nombre}`}>{nuevo === "principal" ? "Hacer dueño" : "Volver miembro"}</button>
      {estado?.error && <span className="text-xs text-danger" role="alert">{estado.error}</span>}
    </form>
  );
}

/** Logo de la empresa: se sube a la carpeta del cliente y se ve en su cuenta junto al de Pime. */
export function LogoEmpresa({ logo, empresa }: { logo: string | null; empresa: string }) {
  const [vista, setVista] = useState(logo);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const iniciales = empresa.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

  async function subir(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Sube una imagen PNG, JPG o WebP."); return; }
    if (file.size > 4 * 1024 * 1024) { setError("La imagen pasa de 4 MB."); return; }
    setSubiendo(true);
    try {
      const fd = new FormData(); fd.append("archivo", file);
      const r = await fetch("/api/cliente/adjuntos", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo subir.");
      const g = new FormData(); g.append("key", j.key); g.append("tipo", j.contentType);
      const res = await guardarLogoAction(null, g);
      if (res?.error) throw new Error(res.error);
      setVista(URL.createObjectURL(file));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo subir."); }
    setSubiendo(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-panel">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo del cliente servido desde su cuenta */}
          {vista ? <img src={vista} alt={`Logo de ${empresa}`} className="h-full w-full object-contain p-2" /> : <span className="text-fg-dim text-xl font-extrabold">{iniciales}</span>}
        </span>
        <p className="text-fg-dim text-sm leading-relaxed">Aparece en tu cuenta junto al de Pime. PNG o WebP con fondo transparente se ve mejor.</p>
      </div>
      {error && <p className={errorBox} role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <label className={`${btnSecundario} cursor-pointer`} aria-busy={subiendo}>
          {subiendo ? "Subiendo…" : vista ? "Cambiar logo" : "Subir el logo"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only text-base" onChange={(e) => void subir(e.target.files?.[0])} disabled={subiendo} />
        </label>
        {vista && <button type="button" className="text-sm font-semibold text-fg-dim hover:text-danger min-h-12 px-3" onClick={async () => { await quitarLogoAction(); setVista(null); }}>Quitar</button>}
      </div>
    </div>
  );
}
