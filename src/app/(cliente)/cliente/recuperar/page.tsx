import { AccesoShell } from "@/components/portal/acceso-shell";
import { RecuperarForm } from "./recuperar-form";

export const metadata = { title: "Olvidé mi contraseña" };

export default function Page() {
  return (
    <AccesoShell eyebrow="Tu cuenta en Pime" title="Olvidé mi contraseña" subtitle="Escribe tu correo y te enviamos un enlace para elegir una contraseña nueva." footer={<a href="/cliente/acceso" className="p-link">Volver a entrar</a>}>
      <RecuperarForm />
    </AccesoShell>
  );
}
