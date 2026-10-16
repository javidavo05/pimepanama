import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { CrearClaveForm } from "./crear-clave-form";

export const metadata = { title: "Crea tu contraseña — Pime Suite" };

export default async function CrearClavePage({ searchParams }: { searchParams: Promise<{ th?: string; t?: string }> }) {
  const { th = "", t = "invite" } = await searchParams;
  return (
    <AuthShell
      eyebrow="Equipo Pime"
      title="Crea tu contraseña"
      subtitle="Con ella entras a Pime Suite. Después se activa la doble verificación."
      footer={<>¿Ya tienes contraseña? <Link href="/empresa/login" className="inline-flex items-center min-h-11 font-semibold text-fg-mute underline underline-offset-4 hover:text-fg">Entrar</Link></>}
    >
      {th ? <CrearClaveForm th={th} t={t} /> : <p className="text-fg-dim text-sm">Este enlace no está completo. Ábrelo desde el correo de invitación, o pídele al dueño que te invite otra vez.</p>}
    </AuthShell>
  );
}
