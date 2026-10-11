"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FingerprintIcon } from "@/components/empresa/fingerprint-icon";
import { biometricLabel, loginWithPasskey, passkeysSupported } from "@/lib/passkeys-client";
import { botonPrincipal, botonSecundario, campo, errorBox, etiqueta } from "@/components/auth/auth-shell";

export function EmpresaLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState<"huella" | "correo" | null>(null);
  // La huella solo aparece donde el navegador la soporta; se decide al montar porque depende del equipo.
  const [bioLabel, setBioLabel] = useState<string | null>(null);
  useEffect(() => { if (passkeysSupported()) setBioLabel(biometricLabel()); }, []);

  async function conHuella() {
    setError(null); setCargando("huella");
    const r = await loginWithPasskey();
    if (!r.ok) { if (r.error) setError(r.error); setCargando(null); return; }
    router.push("/empresa"); router.refresh();
  }

  async function conCorreo(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setCargando("correo");
    const { error: authError } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (authError) { setError("El correo o la contraseña no coinciden. Revísalos e intenta otra vez."); setCargando(null); return; }
    router.push("/empresa"); router.refresh();
  }

  return (
    <div className="space-y-6">
      {bioLabel && (
        <>
          <button type="button" onClick={() => void conHuella()} disabled={cargando !== null} className={`${botonPrincipal} gap-2`}>
            <FingerprintIcon className="h-5 w-5" />
            {cargando === "huella" ? "Esperando tu huella…" : `Entrar con ${bioLabel}`}
          </button>
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" /><span className="text-fg-faint text-xs">o con tu correo</span><span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}
      <form onSubmit={conCorreo} className="space-y-4">
        <div>
          <label htmlFor="login-email" className={etiqueta}>Correo</label>
          <input id="login-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="nombre@pimepanama.com" className={campo} />
        </div>
        <div>
          <label htmlFor="login-clave" className={etiqueta}>Contraseña</label>
          <input id="login-clave" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={campo} />
        </div>
        {error && <p className={errorBox} role="alert">{error}</p>}
        <button type="submit" disabled={cargando !== null} className={bioLabel ? botonSecundario : botonPrincipal}>
          {cargando === "correo" ? "Entrando…" : "Entrar con correo y contraseña"}
        </button>
      </form>
    </div>
  );
}
