import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";
import { prisma } from "@/lib/prisma";
import type { EmpresaUser, CompanyConfig } from "@prisma/client";

export type EmpresaUserWithConfig = EmpresaUser & {
  config: CompanyConfig | null;
};

export async function getEmpresaUser(): Promise<EmpresaUserWithConfig> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/empresa/login");
  }

  const empresaUser = await prisma.empresaUser.findUnique({
    where: { supabaseUid: user.id },
    include: { config: true },
  });

  if (!empresaUser) {
    // Authenticated with Supabase but no EmpresaUser record yet — auto-provision
    const newUser = await prisma.empresaUser.create({
      data: {
        supabaseUid: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name ?? null,
      },
      include: { config: true },
    });
    return newUser;
  }

  return empresaUser;
}
