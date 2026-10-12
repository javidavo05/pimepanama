import { createServerClient } from "@supabase/ssr";
import { resolverEquipo, type EmpresaUserWithConfig } from "@/lib/auth/equipo";
import { MFA_COOKIE, sesionVerificada } from "@/lib/auth/mfa";
import { leerPermisoDirecto } from "@/lib/directo";

export type { EmpresaUserWithConfig };

const negar = (status: number, error: string, code: string) =>
  new Response(JSON.stringify({ error, code }), { status, headers: { "Content-Type": "application/json" } });

export async function requireEmpresaUser(request: Request): Promise<EmpresaUserWithConfig> {
  // Llamadas largas hechas directo al dominio del proyecto (ver lib/directo.ts):
  // el permiso solo se emite a una sesión que ya pasó login y doble verificación.
  const directo = leerPermisoDirecto(request);
  if (directo) {
    const r = await resolverEquipo({ sub: directo });
    if (r.estado !== "equipo") throw negar(403, "Esta cuenta no tiene acceso a la suite.", "sin_acceso");
    return r.user;
  }

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

  // Verificación local del JWT (ES256); ver getEmpresaUser.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    throw negar(401, "Unauthorized", "unauthorized");
  }

  const r = await resolverEquipo(claims as { sub: string; email?: string; user_metadata?: Record<string, unknown> });
  if (r.estado !== "equipo") throw negar(403, "Esta cuenta no tiene acceso a la suite.", "sin_acceso");

  const marca = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${MFA_COOKIE}=`))?.slice(MFA_COOKIE.length + 1);
  if (!sesionVerificada(claims, marca ? decodeURIComponent(marca) : null)) {
    throw negar(403, "Falta la doble verificación de esta sesión.", "mfa_required");
  }

  return r.user;
}
