import { AccesoShell } from "@/components/portal/acceso-shell";
import { errorBox } from "@/components/auth/auth-shell";
import { NuevaClaveForm } from "./nueva-clave-form";

export const metadata = { title: "Contraseña nueva" };

export default async function Page({ searchParams }: { searchParams: Promise<{ th?: string }> }) {
  const { th } = await searchParams;
  return (
    <AccesoShell eyebrow="Tu cuenta en Pime" title="Elige una contraseña nueva">
      {th ? <NuevaClaveForm th={th} /> : <p className={errorBox} role="alert">El enlace está incompleto. Ábrelo desde el correo o pide uno nuevo en «Olvidé mi contraseña».</p>}
    </AccesoShell>
  );
}
