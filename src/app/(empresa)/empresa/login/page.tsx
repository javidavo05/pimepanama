import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmpresaLoginForm } from "./login-form";

export const metadata = {
  title: "Acceso — Pime Communications Suite",
};

export default async function EmpresaLoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/empresa");

  return (
    <div className="min-h-screen bg-[#030611] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo mark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#C8A96E]/10 border border-[#C8A96E]/30 flex items-center justify-center">
              <span className="text-[#C8A96E] font-bold text-lg tracking-tight">P</span>
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm tracking-widest uppercase">Pime</p>
              <p className="text-[#C8A96E] text-xs tracking-[0.3em] uppercase">Suite</p>
            </div>
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            Communications Suite
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Plataforma interna · Acceso corporativo
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-8">
          <EmpresaLoginForm />
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          © {new Date().getFullYear()} Pime Panamá. Sistema de uso interno.
        </p>
      </div>
    </div>
  );
}
