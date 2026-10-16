/**
 * «Darme de baja» de las campañas (pública, sin sesión). No da de baja al abrir: los antivirus de correo abren
 * los enlaces solos, así que la baja se confirma con un botón.
 */
import type { Metadata } from "next";
import { AuthShell, errorBox, okBox } from "@/components/auth/auth-shell";
import { leerTokenBaja } from "@/lib/crm/correo-baja";
import { prisma } from "@/lib/prisma";
import { BajaForm } from "./baja-form";

export const metadata: Metadata = { title: "Darme de baja — Pime Panamá", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BajaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quien = leerTokenBaja(decodeURIComponent(token).slice(0, 600));
  const ya = quien
    ? await prisma.bajaCorreo.findUnique({ where: { userId_email: { userId: quien.userId, email: quien.email } }, select: { id: true } }).catch(() => null)
    : null;

  return (
    <div className="theme-dark empresa-app">
      <AuthShell
        eyebrow="Pime Panamá"
        title="Darme de baja"
        subtitle="Deja de recibir nuestras campañas por correo."
        footer={<>¿Dudas? Escríbenos a <a href="mailto:info@pimepanama.com" className="inline-flex items-center min-h-11 font-semibold text-fg-mute underline underline-offset-4 hover:text-fg">info@pimepanama.com</a></>}
      >
        {!quien ? (
          <p className={errorBox} role="alert">
            Este enlace no es válido o está incompleto. Ábrelo de nuevo desde el correo, o escríbenos y te damos de baja a mano.
          </p>
        ) : ya ? (
          <p className={okBox} role="status">
            <strong className="[overflow-wrap:anywhere]">{quien.email}</strong> ya estaba dado de baja: no te llegan más campañas.
          </p>
        ) : (
          <BajaForm token={decodeURIComponent(token)} email={quien.email} />
        )}
      </AuthShell>
    </div>
  );
}
