import { AuthShell } from "@/components/auth/auth-shell";
import { VerificarEquipo } from "./verificar-client";

export const metadata = { title: "Verificar acceso — Pime Suite", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell eyebrow="Doble verificación" title="Escribe tu código" subtitle="Abre la app de códigos en tu teléfono y escribe los 6 dígitos de Pime." footer="La doble verificación protege la suite aunque alguien conozca tu contraseña.">
      <VerificarEquipo />
    </AuthShell>
  );
}
