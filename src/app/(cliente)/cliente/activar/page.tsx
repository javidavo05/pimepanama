import { AccesoShell } from "@/components/portal/acceso-shell";
import { errorBox } from "@/components/auth/auth-shell";
import { validarInvitacion } from "@/lib/portal/invitaciones";
import { ActivarForm } from "./activar-form";

export const metadata = { title: "Crear tu contraseña" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const v = await validarInvitacion(token);
  if (!v.ok) {
    return (
      <AccesoShell eyebrow="Tu cuenta en Pime" title="No pudimos abrir la invitación">
        <p className={errorBox} role="alert">{v.error}</p>
        <a href="/cliente/acceso" className="p-link mt-4">Ir a entrar</a>
      </AccesoShell>
    );
  }
  const { persona, cliente } = v.data;
  return (
    <AccesoShell eyebrow={cliente.company || cliente.name} title="Crea tu contraseña" subtitle={<>Vas a entrar con <b className="text-fg">{persona.email}</b>.</>}>
      <ActivarForm token={token!} nombre={persona.fullName ?? ""} />
    </AccesoShell>
  );
}
