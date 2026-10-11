import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administración del sitio — Pime" };

export default async function LoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");
  return (
    <AuthShell eyebrow="Sitio web" title="Administración del sitio" subtitle="Acceso para editar el contenido de pimepanama.com." footer="¿Necesitas acceso? Pídeselo al administrador de Pime.">
      <LoginForm />
    </AuthShell>
  );
}
