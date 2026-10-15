import { redirect } from "next/navigation";
import { AccesoShell } from "@/components/portal/acceso-shell";
import { errorBox } from "@/components/auth/auth-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccesoForm } from "./acceso-form";

export const metadata = { title: "Entrar" };

const AVISOS: Record<string, string> = {
  equipo: "Esta sesión es de una cuenta del equipo Pime, no de un cliente. Cierra sesión para entrar con la cuenta del cliente.",
  desactivada: "Esta cuenta está desactivada. Escríbele a Pime si necesitas volver a entrar.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (uid && !aviso) {
    const persona = await prisma.clientUser.findUnique({ where: { supabaseUid: uid }, select: { status: true } });
    if (persona?.status === "activo") redirect("/cliente");
  }
  return (
    <AccesoShell eyebrow="Tu cuenta en Pime" title="Entra a tu cuenta" subtitle="Avance de tus proyectos, tickets de soporte, aprobaciones, facturas y pagos." footer={<>¿Todavía no tienes cuenta? Pime te envía una invitación por correo.</>}>
      {aviso && AVISOS[aviso] && <p className={`${errorBox} mb-6`} role="alert">{AVISOS[aviso]}</p>}
      <AccesoForm conSesion={!!uid} />
    </AccesoShell>
  );
}
