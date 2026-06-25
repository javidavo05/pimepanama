import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import type { EmpresaUser, CompanyConfig } from "@prisma/client";

export type EmpresaUserWithConfig = EmpresaUser & { config: CompanyConfig | null };

export async function requireEmpresaUser(request: Request): Promise<EmpresaUserWithConfig> {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieHeader.split(";").map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name: name.trim(), value: rest.join("=") };
          });
        },
        setAll() {
          // Read-only in route handlers — cookies are set via middleware
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const empresaUser = await prisma.empresaUser.findUnique({
    where: { supabaseUid: user.id },
    include: { config: true },
  });

  if (!empresaUser) {
    // Auto-provision on first API call
    const newUser = await prisma.empresaUser.create({
      data: { supabaseUid: user.id, email: user.email! },
      include: { config: true },
    });
    return newUser;
  }

  return empresaUser;
}
