import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "./server";
import { resolverEquipo, type EmpresaUserWithConfig } from "@/lib/auth/equipo";
import { MFA_COOKIE, sesionVerificada } from "@/lib/auth/mfa";

export type { EmpresaUserWithConfig };

// cache() dedupes this across layout + page within the same request — sin
// esto, cada página protegida repetía la llamada a Supabase auth.getUser()
// y la consulta a Prisma una vez por layout y otra vez por page.
export const getEmpresaUser = cache(async (): Promise<EmpresaUserWithConfig> => {
  const supabase = await createSupabaseServerClient();
  // getClaims() verifica el JWT localmente con las llaves públicas del proyecto
  // (ES256): se ahorra el viaje a Supabase Auth en cada navegación.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    redirect("/empresa/login");
  }

  const r = await resolverEquipo(claims as { sub: string; email?: string; user_metadata?: Record<string, unknown> });
  if (r.estado === "cliente") redirect("/cliente");
  if (r.estado === "sin_acceso") redirect("/empresa/sin-acceso");

  // Doble verificación obligatoria para el equipo (código de la app, huella o llave).
  const marca = (await cookies()).get(MFA_COOKIE)?.value;
  if (!sesionVerificada(claims, marca)) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    redirect(aal?.nextLevel === "aal2" ? "/empresa/verificar" : "/empresa/activar-2fa");
  }

  return r.user;
});
