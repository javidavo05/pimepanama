"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function EmpresaLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <div>
        <label className="block text-white/60 text-xs font-medium uppercase tracking-widest mb-2">
          Correo corporativo
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="nombre@pimepanama.com"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/50 focus:ring-1 focus:ring-[#C8A96E]/20 transition-all"
        />
      </div>

      <div>
        <label className="block text-white/60 text-xs font-medium uppercase tracking-widest mb-2">
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/50 focus:ring-1 focus:ring-[#C8A96E]/20 transition-all"
        />
      </div>

      {error && (
        <p className="text-red-400/80 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 disabled:cursor-not-allowed text-[#030611] font-semibold text-sm py-3 rounded-lg transition-all tracking-wide"
      >
        {loading ? "Verificando..." : "Ingresar al sistema"}
      </button>
    </form>
  );
}
