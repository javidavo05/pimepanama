import { AuthShell } from "@/components/auth/auth-shell";
import { ActivarEquipo } from "./activar-client";

export const metadata = { title: "Activar doble verificación — Pime Suite", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell
      eyebrow="Seguridad del equipo"
      title="Activa la doble verificación"
      subtitle="Para entrar a la suite hace falta tu contraseña y un código de tu teléfono. Si entras con huella o llave de acceso, no te lo pide."
    >
      <ActivarEquipo />
    </AuthShell>
  );
}
