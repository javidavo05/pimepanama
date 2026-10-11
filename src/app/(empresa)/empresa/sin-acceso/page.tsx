import { AuthShell } from "@/components/auth/auth-shell";
import { SalirBoton } from "./salir";

export const metadata = { title: "Sin acceso — Pime Suite", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell eyebrow="Pime Suite" title="Esta cuenta no tiene acceso" subtitle="La suite es solo para el equipo de Pime. Si eres cliente, entra a tu cuenta en pimepanama.com/cliente.">
      <SalirBoton />
    </AuthShell>
  );
}
