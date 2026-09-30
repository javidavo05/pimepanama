"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FingerprintIcon } from "@/components/empresa/fingerprint-icon";
import { biometricLabel, loginWithPasskey, passkeysSupported } from "@/lib/passkeys-client";

export function EmpresaLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // La huella solo aparece donde el navegador la soporta; se decide al montar
  // porque depende del dispositivo, no de la sesión.
  const [bioLabel, setBioLabel] = useState<string | null>(null);

  useEffect(() => {
    if (passkeysSupported()) setBioLabel(biometricLabel());
  }, []);

  async function handlePasskey() {
    setError(null);
    setLoading(true);
    const result = await loginWithPasskey();
    if (!result.ok) {
      if (result.error) setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/empresa");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      setLoading(false);
      return;
    }

    router.push("/empresa");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {bioLabel && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => void handlePasskey()}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-fill border border-line-mid hover:border-sand/50 disabled:opacity-50 disabled:cursor-not-allowed text-fg font-medium text-sm py-3 rounded-lg transition-all"
          >
            <FingerprintIcon className="w-5 h-5" />
            Entrar con {bioLabel}
          </button>
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="text-fg-faint text-xs">o con tu correo</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-fg-dim text-xs font-medium uppercase tracking-widest mb-2">
          Correo corporativo
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="nombre@pimepanama.com"
          className="w-full bg-fill border border-line rounded-lg px-4 py-3 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-sand/50 focus:ring-1 focus:ring-sand/20 transition-all"
        />
      </div>

      <div>
        <label className="block text-fg-dim text-xs font-medium uppercase tracking-widest mb-2">
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full bg-fill border border-line rounded-lg px-4 py-3 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-sand/50 focus:ring-1 focus:ring-sand/20 transition-all"
        />
      </div>

      {error && (
        <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-sand hover:bg-sand-lt disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-semibold text-sm py-3 rounded-lg transition-all tracking-wide"
      >
        {loading ? "Verificando..." : "Ingresar al sistema"}
      </button>
    </form>
  );
}
