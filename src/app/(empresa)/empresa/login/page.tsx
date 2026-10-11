import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmpresaLoginForm } from "./login-form";

export const metadata = { title: "Entrar — Pime Suite" };

export default async function EmpresaLoginPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/empresa");

  return (
    <AuthShell
      eyebrow="Equipo Pime"
      title="Entra a Pime Suite"
      subtitle="Clientes, proyectos, cobros y sistemas en un solo lugar."
      footer={<>¿Eres cliente de Pime? <Link href="/cliente/acceso" className="inline-flex items-center min-h-11 font-semibold text-fg-mute underline underline-offset-4 hover:text-fg">Entra a tu cuenta</Link></>}
    >
      <EmpresaLoginForm />
    </AuthShell>
  );
}
