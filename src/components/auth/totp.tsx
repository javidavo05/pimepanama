"use client";

/**
 * Doble verificación con una app de códigos (Google Authenticator, 1Password, Authy…), sobre el
 * MFA nativo de Supabase. Sirve igual para el equipo (obligatoria) y para clientes (opcional).
 *  - <ActivarTotp>: muestra el QR y la clave, pide el primer código y deja el factor verificado.
 *  - <VerificarTotp>: pide el código de una sesión que ya tiene el factor y la sube a aal2.
 */
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { botonPrincipal, campo, errorBox, etiqueta } from "./auth-shell";

const soloDigitos = (v: string) => v.replace(/\D/g, "").slice(0, 6);

function CampoCodigo({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label htmlFor="codigo" className={etiqueta}>Código de 6 dígitos</label>
      <input
        id="codigo"
        className={`${campo} text-center text-2xl tracking-[0.4em] font-semibold tabular-nums`}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="000000"
        value={value}
        onChange={(e) => onChange(soloDigitos(e.target.value))}
        disabled={disabled}
        autoFocus
      />
    </div>
  );
}

export function ActivarTotp({ onListo, nombre = "Pime" }: { onListo: () => void; nombre?: string }) {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      // Un intento anterior sin terminar deja un factor sin verificar que bloquea uno nuevo: se limpia.
      const { data: lista } = await supabase.auth.mfa.listFactors();
      for (const f of lista?.all ?? []) {
        if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `${nombre} ${new Date().toISOString().slice(0, 10)}` });
      if (!vivo) return;
      if (e || !data) setError("No se pudo preparar la doble verificación. Recarga la página e inténtalo de nuevo.");
      else setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCargando(false);
    })();
    return () => { vivo = false; };
  }, [nombre]);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    if (!factor || codigo.length !== 6) return;
    setVerificando(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: codigo });
    if (err) { setError("El código no coincide o ya venció. Escribe el que muestra la app ahora."); setVerificando(false); setCodigo(""); return; }
    onListo();
  }

  if (cargando) return <p className="text-fg-dim text-sm" role="status">Preparando el código…</p>;
  return (
    <form onSubmit={verificar} className="space-y-6">
      <ol className="space-y-4 text-sm text-fg-mute">
        <li><b className="text-fg">1.</b> Abre una app de códigos en tu teléfono (Google Authenticator, 1Password o Authy).</li>
        <li>
          <b className="text-fg">2.</b> Escanea este código QR.
          {factor && (
            <span className="mt-3 flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- QR en data URL generado por Supabase */}
              <img src={factor.qr} alt="Código QR para la app de códigos" width={176} height={176} className="h-44 w-44 rounded-lg bg-white p-2" />
              <span className="text-xs text-fg-faint text-center">¿No puedes escanear? Escribe esta clave en la app:</span>
              <code className="select-all break-all rounded-md bg-fill-2 px-3 py-2 text-xs text-fg font-semibold tracking-wider">{factor.secret}</code>
            </span>
          )}
        </li>
        <li><b className="text-fg">3.</b> Escribe el código que aparece en la app.</li>
      </ol>
      <CampoCodigo value={codigo} onChange={setCodigo} disabled={verificando || !factor} />
      {error && <p className={errorBox} role="alert">{error}</p>}
      <button type="submit" className={botonPrincipal} disabled={verificando || codigo.length !== 6 || !factor}>
        {verificando ? "Verificando…" : "Activar la doble verificación"}
      </button>
    </form>
  );
}

export function VerificarTotp({ onListo }: { onListo: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const f = data?.totp?.find((x) => x.status === "verified");
      if (f) setFactorId(f.id); else setError("Esta cuenta no tiene la doble verificación activa.");
    })();
  }, []);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || codigo.length !== 6) return;
    setVerificando(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: codigo });
    if (err) { setError("El código no coincide o ya venció. Escribe el que muestra la app ahora."); setVerificando(false); setCodigo(""); return; }
    onListo();
  }

  // Se envía solo al completar los 6 dígitos: un paso menos.
  useEffect(() => { if (codigo.length === 6 && factorId && !verificando) void verificar(new Event("submit") as unknown as React.FormEvent); }, [codigo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form onSubmit={verificar} className="space-y-6">
      <CampoCodigo value={codigo} onChange={setCodigo} disabled={verificando} />
      {error && <p className={errorBox} role="alert">{error}</p>}
      <button type="submit" className={botonPrincipal} disabled={verificando || codigo.length !== 6 || !factorId}>
        {verificando ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}

export async function cerrarSesion(destino: string) {
  await createSupabaseBrowserClient().auth.signOut();
  window.location.href = destino;
}
