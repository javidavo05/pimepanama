import { AuthShell } from "@/components/auth/auth-shell";
import { VerificarCliente } from "./verificar-client";

export const metadata = { title: "Verificar acceso" };

export default function Page() {
  return (
    <AuthShell eyebrow="Doble verificación" title="Escribe tu código" subtitle="Abre la app de códigos de tu teléfono y escribe los 6 dígitos de Pime.">
      <VerificarCliente />
    </AuthShell>
  );
}
