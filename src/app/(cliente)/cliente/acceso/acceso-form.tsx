"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { botonPrincipal, botonSecundario, campo, errorBox, etiqueta } from "@/components/auth/auth-shell";
import { CampoClave } from "@/components/auth/campo-clave";
import { cerrarSesion } from "@/components/auth/totp";

export function AccesoForm({ conSesion }: { conSesion: boolean }) {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave });
    if (err) { setError("El correo o la contraseña no coinciden."); setCargando(false); return; }
    window.location.href = "/cliente";
  }

  return (
    <form onSubmit={entrar} className="space-y-5">
      <div>
        <label htmlFor="email" className={etiqueta}>Correo</label>
        <input id="email" type="email" autoComplete="email" inputMode="email" required className={campo} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="clave" className={etiqueta}>Contraseña</label>
        <CampoClave id="clave" autoComplete="current-password" required className={campo} value={clave} onChange={(e) => setClave(e.target.value)} />
        <div className="flex justify-end"><a href="/cliente/recuperar" className="inline-flex items-center min-h-11 text-xs font-semibold text-brand-fg hover:underline">Olvidé mi contraseña</a></div>
      </div>
      {error && <p className={errorBox} role="alert">{error}</p>}
      <button type="submit" className={botonPrincipal} disabled={cargando}>{cargando ? "Entrando…" : "Entrar a mi cuenta"}</button>
      {conSesion && <button type="button" className={botonSecundario} onClick={() => void cerrarSesion("/cliente/acceso")}>Cerrar la sesión abierta</button>}
    </form>
  );
}
