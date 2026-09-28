import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";
import { prisma } from "@/lib/prisma";
import type { EmpresaUser, CompanyConfig } from "@prisma/client";

export type EmpresaUserWithConfig = EmpresaUser & {
  config: CompanyConfig | null;
};

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

  const empresaUser = await prisma.empresaUser.findUnique({
    where: { supabaseUid: claims.sub },
    include: { config: true },
  });

  if (!empresaUser) {
    // Authenticated with Supabase but no EmpresaUser record yet — auto-provision
    const newUser = await prisma.empresaUser.create({
      data: {
        supabaseUid: claims.sub,
        email: claims.email!,
        fullName: (claims.user_metadata?.full_name as string | undefined) ?? null,
      },
      include: { config: true },
    });
    return newUser;
  }

  return empresaUser;
});
