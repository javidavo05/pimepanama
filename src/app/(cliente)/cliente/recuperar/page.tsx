import { AuthShell } from "@/components/auth/auth-shell";
import { RecuperarForm } from "./recuperar-form";

export const metadata = { title: "Olvidé mi contraseña" };

export default function Page() {
  return (
    <AuthShell eyebrow="Tu cuenta en Pime" title="Olvidé mi contraseña" subtitle="Escribe tu correo y te enviamos un enlace para elegir una contraseña nueva." footer={<a href="/cliente/acceso" className="font-semibold text-brand-fg hover:underline">Volver a entrar</a>}>
      <RecuperarForm />
    </AuthShell>
  );
}
